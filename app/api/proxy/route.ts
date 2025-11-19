import { NextResponse } from 'next/server'

// Simple proxy to forward client requests to an external webhook.
// The client should POST JSON with fields:
// - webhookUrl: string (required)
// - message, messages (optional) for JSON payloads
// - audioBase64, audioFilename (optional) for audio uploads (base64 string)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { webhookUrl, message, messages, audioBase64, audioFilename } = body

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing webhookUrl' }), { status: 400 })
    }

    const controller = new AbortController()
    // Mirror the client timeout (5 minutes)
    const timeout = setTimeout(() => controller.abort(), 300000)

    let forwardRes: Response

    if (audioBase64) {
      // Construct FormData with a binary audio file and messages
      const formData = new FormData()
      // Convert base64 to Uint8Array
      const buffer = Buffer.from(audioBase64, 'base64')
      const blob = new Blob([buffer], { type: 'audio/wav' })
      formData.append('audio', blob, audioFilename || 'audio.wav')
      formData.append('messages', JSON.stringify(messages || []))

      forwardRes = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
    } else {
      // Forward as JSON
      forwardRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, messages }),
        signal: controller.signal,
      })
    }

    clearTimeout(timeout)

    const contentType = forwardRes.headers.get('content-type') || 'text/plain'
    const payload = await forwardRes.arrayBuffer()

    return new Response(payload, {
      status: forwardRes.status,
      headers: { 'content-type': contentType },
    })
  } catch (err: any) {
    console.error('Proxy error:', err)
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Upstream request timed out' }), { status: 504 })
    }
    return new Response(JSON.stringify({ error: 'Proxy failed', details: String(err) }), { status: 500 })
  }
}
