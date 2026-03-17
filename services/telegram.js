// Only AI report bot — raw TG messages handled by extension directly

const BOT_TOKEN = process.env.AI_BOT_TOKEN
const CHAT_ID   = process.env.AI_CHAT_ID

function splitChunks(text, maxLen = 4000) {
    const chunks = []
    let current  = ''
    for (const line of text.split('\n')) {
        if (current.length + line.length + 1 > maxLen) {
            if (current) chunks.push(current.trim())
            current = line + '\n'
        } else {
            current += line + '\n'
        }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
}

async function sendMessage(text) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('[TG] Missing AI_BOT_TOKEN or AI_CHAT_ID')
        return
    }

    const chunks = splitChunks(text)

    for (const chunk of chunks) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    chat_id:    CHAT_ID,
                    text:       chunk,
                    parse_mode: 'Markdown'
                })
            })
            const data = await res.json()
            if (!data.ok) console.error('[TG] Send failed:', data.description)
        } catch (err) {
            console.error('[TG] Error:', err.message)
        }

        // delay between chunks to avoid rate limit
        await new Promise(r => setTimeout(r, 500))
    }
}

export const sendAIReport = sendMessage
