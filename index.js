import 'dotenv/config'
import express from 'express'
import { connectDB, getRecentEvents, saveReport } from './services/mongodb.js'
import { startCronJobs } from './cron.js'
import { analyzeEvents } from './services/gemini.js'
import { sendAIReport } from './services/telegram.js'
import ingestRoute from './routes/ingest.js'
import healthRoute from './routes/health.js'

const app = express()
const PORT = process.env.PORT || 3000

// ─── Middleware ────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }))

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
})

// ─── Routes ────────────────────────────────────────────────
app.use('/ingest', ingestRoute)
app.use('/health', healthRoute)

// temporary manual trigger — remove after testing
app.get('/trigger-analysis', async (req, res) => {
    try {
        const periodEnd = new Date()
        const periodStart = new Date(Date.now() - 6 * 60 * 60 * 1000)

        const events = await getRecentEvents(6)

        if (events.length === 0) {
            return res.json({ status: 'no events in MongoDB yet' })
        }

        const reportText = await analyzeEvents(events)

        const header =
            `📊 *Manual Test Report*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 ${events.length} events analyzed\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n`

        await sendAIReport(header + reportText)
        await saveReport(periodStart, periodEnd, events.length, reportText)

        res.json({ status: 'done', events: events.length })

    } catch (err) {
        console.error('[Trigger] Error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

// 404 fallback
app.use((req, res) => {
    res.status(404).json({ status: 'not found' })
})

// ─── Start ─────────────────────────────────────────────────
async function start() {
    await connectDB()
    startCronJobs()
    app.listen(PORT, () => {
        console.log(`[Server] Running on port ${PORT}`)
    })
}

start()