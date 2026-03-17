import cron from 'node-cron'
import { getRecentEvents, deleteOldEvents, saveReport } from './services/mongodb.js'
import { analyzeEvents } from './services/gemini.js'
import { sendAIReport } from './services/telegram.js'

export function startCronJobs() {

    // runs every 6 hours: at 00:00, 06:00, 12:00, 18:00
    cron.schedule('0 */6 * * *', async () => {
        console.log('[Cron] Starting 6hr AI analysis...')

        const periodEnd   = new Date()
        const periodStart = new Date(Date.now() - 6 * 60 * 60 * 1000)

        try {
            // 1. get last 6hrs of events
            const events = await getRecentEvents(6)

            if (events.length === 0) {
                console.log('[Cron] No events in last 6hrs, skipping')
                return
            }

            console.log(`[Cron] Analyzing ${events.length} events...`)

            // 2. send to Gemini
            const reportText = await analyzeEvents(events)

            if (!reportText) {
                console.log('[Cron] Gemini returned nothing, skipping')
                return
            }

            // 3. build full message
            const header =
                `📊 *6-Hour Intelligence Report*\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `🕐 ${periodStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} → ` +
                `${periodEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}\n` +
                `📝 ${events.length} events analyzed\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n\n`

            const fullReport = header + reportText

            // 4. send to Telegram AI bot
            await sendAIReport(fullReport)
            console.log('[Cron] AI report sent to Telegram')

            // 5. save report to MongoDB
            await saveReport(periodStart, periodEnd, events.length, reportText)
            console.log('[Cron] Report saved to MongoDB')

            // 6. delete analyzed events from MongoDB
            await deleteOldEvents(6)
            console.log('[Cron] Old events cleaned from MongoDB')

        } catch (err) {
            console.error('[Cron] Error during analysis:', err.message)
        }
    })

    console.log('[Cron] 6hr analysis job scheduled')
}
