'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Volume2 } from 'lucide-react'
import { ChatMessage } from '@/types'

interface ChatInterfaceProps {
  chatMessages: ChatMessage[]
  onMessagesUpdate: (messages: ChatMessage[]) => void
  volume: number
}

export default function ChatInterface({
  chatMessages,
  onMessagesUpdate,
  volume,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages)
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    setMessages(chatMessages)
  }, [chatMessages])

  // Helper to update messages state and notify parent so chats are persisted
  const updateMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages)
    try {
      onMessagesUpdate(newMessages)
    } catch (err) {
      console.error('onMessagesUpdate failed:', err)
    }
  }

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getWebhookUrl = () => {
    const config = localStorage.getItem('admin-config')
    if (config) {
      const parsed = JSON.parse(config)
      try {
        // Validate the URL string
        if (!parsed.webhookUrl) return null
        new URL(parsed.webhookUrl)
        return parsed.webhookUrl
      } catch (err) {
        console.warn('Invalid webhook URL in admin-config:', parsed.webhookUrl)
        return null
      }
    }
    return null
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await sendAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Unable to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudio = async (audioBlob: Blob) => {
    setIsLoading(true)
    
    // Create user message with audio
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: 'Voice message',
      audio: URL.createObjectURL(audioBlob),
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    updateMessages(updatedMessages)

    // Send to webhook
    const webhookUrl = getWebhookUrl()
    if (!webhookUrl) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: 'Webhook not configured or invalid. Please set a valid webhook URL in the admin settings.',
        timestamp: new Date().toISOString(),
      }
      updateMessages([...updatedMessages, errorMessage])
      setIsLoading(false)
      return
    }

    try {
      // Encode audio as base64 and send to our server proxy to avoid CORS / mixed-content issues
      const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const parts = result.split(',')
          resolve(parts[1] || '')
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const audioBase64 = await toBase64(audioBlob)

      const controller = new AbortController()
      // Mirror the server timeout (5 minutes)
      const timeout = setTimeout(() => controller.abort(), 300000)

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          audioBase64,
          audioFilename: 'audio.wav',
          messages: updatedMessages.slice(-6),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: data.output || 'Response received',
          audio: data.audio ? `data:audio/mp3;base64,${data.audio}` : undefined,
          timestamp: new Date().toISOString(),
        }
        const finalMessages = [...updatedMessages, aiMessage]
        updateMessages(finalMessages)
      } else {
        console.error('Proxy returned non-OK status:', response.status)
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: `Proxy error: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        }
        updateMessages([...updatedMessages, errorMessage])
      }
    } catch (err) {
      console.error('Error sending audio:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: err && (err as any).name === 'AbortError' ? 'Request timed out. Please try again.' : 'Failed to send your message. Please check your network or webhook and try again.',
        timestamp: new Date().toISOString(),
      }
      updateMessages([...updatedMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    setIsLoading(true)
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    updateMessages(updatedMessages)
    setInput('')

    const webhookUrl = getWebhookUrl()
    if (!webhookUrl) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: 'Webhook not configured or invalid. Please set a valid webhook URL in the admin settings.',
        timestamp: new Date().toISOString(),
      }
      updateMessages([...updatedMessages, errorMessage])
      setIsLoading(false)
      return
    }

    try {
      const controller = new AbortController()
      // Mirror server timeout (5 minutes)
      const timeout = setTimeout(() => controller.abort(), 300000)

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          message: input,
          messages: updatedMessages.slice(-6),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: data.output || 'Response received',
          audio: data.audio ? `data:audio/mp3;base64,${data.audio}` : undefined,
          timestamp: new Date().toISOString(),
        }
        const finalMessages = [...updatedMessages, aiMessage]
        updateMessages(finalMessages)
      } else {
        console.error('Proxy returned non-OK status:', response.status)
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: `Proxy error: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        }
        updateMessages([...updatedMessages, errorMessage])
      }
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: err && (err as any).name === 'AbortError' ? 'Request timed out. Please try again.' : 'Failed to send your message. Please check your network or webhook and try again.',
        timestamp: new Date().toISOString(),
      }
      updateMessages([...updatedMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.volume = volume / 100
      audioRef.current.play()
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Start your consultation</p>
              <p className="text-sm">Send a message or use the voice button</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground border border-border'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                {msg.audio && (
                  <button
                    onClick={() => playAudio(msg.audio!)}
                    className="mt-2 flex items-center gap-2 text-xs opacity-80 hover:opacity-100"
                  >
                    <Volume2 size={14} />
                    Play
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground px-4 py-3 rounded-lg border border-border">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-lg transition-all ${
              isRecording
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
            title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
          >
            <Mic size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-input border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isRecording || isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isRecording || isLoading || !input.trim()}
            className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      <audio ref={audioRef} />
    </div>
  )
}
