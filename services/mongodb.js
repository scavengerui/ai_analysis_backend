import mongoose from 'mongoose'

// ─── Schemas ───────────────────────────────────────────────

const eventSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, index: true },
    hostname: { type: String, default: 'unknown' },
    type: { type: String, default: 'unknown' },
    field: { type: String, default: '' },
    value: { type: String, default: '' },
    time: { type: String, default: '' },
    browser: { type: String, default: '' },
    profile: { type: String, default: '' }
})

const reportSchema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    eventCount: { type: Number, default: 0 },
    reportText: { type: String, required: true }
})

export const Event = mongoose.model('Event', eventSchema)
export const Report = mongoose.model('Report', reportSchema)

// ─── Connection ────────────────────────────────────────────

export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('[DB] MongoDB connected')
    } catch (err) {
        console.error('[DB] Connection failed:', err.message)
        process.exit(1)
    }
}

// ─── Queries ───────────────────────────────────────────────

// store array of events from extension
export async function storeEvents(events, browser = '', profile = '') {
    if (!events || events.length === 0) return

    const docs = events.map(e => ({
        hostname: e.hostname || 'unknown',
        type: e.type || 'unknown',
        field: e.field || '',
        value: e.text || e.value || e.summary || '',
        time: e.time || '',
        browser,
        profile
    }))

    await Event.insertMany(docs)
}

// get all events from last N hours
export async function getRecentEvents(hoursBack = 6) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
    return Event.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 })
}

// delete events older than N hours (called after analysis)
export async function deleteOldEvents(hoursBack = 6) {
    const before = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
    const result = await Event.deleteMany({ timestamp: { $lt: before } })
    console.log(`[DB] Deleted ${result.deletedCount} old events`)
}

// save AI report
export async function saveReport(periodStart, periodEnd, eventCount, reportText) {
    await Report.create({ periodStart, periodEnd, eventCount, reportText })
}
