'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Volume2, Menu } from 'lucide-react'
import { ChatMessage } from '@/types'

interface ChatInterfaceProps {
  chatMessages: ChatMessage[]
  onMessagesUpdate: (messages: ChatMessage[]) => void
  volume: number
  onToggleLeftPanel?: () => void
}

export default function ChatInterface({
  chatMessages,
  onMessagesUpdate,
  volume,
  onToggleLeftPanel,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages)
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [typingDots, setTypingDots] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Safe logging utility
  const safeLogError = (message: string, ...args: any[]) => {
    if (typeof console !== 'undefined' && console.warn) {
      (console as any).warn(message, ...args)
    }
  }

  const safeLogWarn = (message: string, ...args: any[]) => {
    if (typeof console !== 'undefined' && console.warn) {
      (console as any).warn(message, ...args)
    }
  }

  useEffect(() => {
    setMessages(chatMessages)
  }, [chatMessages])

  // Typing animation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setTypingDots(prev => prev === '...' ? '' : prev + '.')
      }, 500)
      return () => clearInterval(interval)
    } else {
      setTypingDots('')
    }
  }, [isLoading])

  // Helper to update messages state and notify parent so chats are persisted
  const updateMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages)
    try {
      onMessagesUpdate(newMessages)
    } catch (err) {
      safeLogError('onMessagesUpdate failed:', err)
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
        safeLogWarn('Invalid webhook URL in admin-config:', parsed.webhookUrl)
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
      safeLogError('Error accessing microphone:', err)
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้')
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
      text: 'ข้อความเสียง',
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
        text: 'ไม่ได้กำหนดค่า Webhook หรือ URL ไม่ถูกต้อง กรุณาตั้งค่า URL Webhook ที่ถูกต้องในแผงควบคุมผู้ดูแล',
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
          text: data.output || 'ได้รับการตอบกลับแล้ว',
          audio: data.audio ? `data:audio/mp3;base64,${data.audio}` : undefined,
          timestamp: new Date().toISOString(),
        }
        const finalMessages = [...updatedMessages, aiMessage]
        updateMessages(finalMessages)
      } else {
        safeLogError('Proxy returned non-OK status:', response.status)
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: `ข้อผิดพลาดของพร็อกซี่: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        }
        updateMessages([...updatedMessages, errorMessage])
      }
    } catch (err) {
      safeLogError('Error sending audio:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: err && (err as any).name === 'AbortError' ? 'คำขอหมดเวลา กรุณาลองใหม่อีกครั้ง' : 'ไม่สามารถส่งข้อความของคุณได้ กรุณาตรวจสอบเครือข่ายหรือ Webhook และลองใหม่อีกครั้ง',
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
        text: 'ไม่ได้กำหนดค่า Webhook หรือ URL ไม่ถูกต้อง กรุณาตั้งค่า URL Webhook ที่ถูกต้องในแผงควบคุมผู้ดูแล',
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
          text: data.output || 'ได้รับการตอบกลับแล้ว',
          audio: data.audio ? `data:audio/mp3;base64,${data.audio}` : undefined,
          timestamp: new Date().toISOString(),
        }
        const finalMessages = [...updatedMessages, aiMessage]
        updateMessages(finalMessages)
      } else {
        safeLogError('Proxy returned non-OK status:', response.status)
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: `ข้อผิดพลาดของพร็อกซี่: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        }
        updateMessages([...updatedMessages, errorMessage])
      }
    } catch (err) {
      safeLogError('Error sending message:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: err && (err as any).name === 'AbortError' ? 'คำขอหมดเวลา กรุณาลองใหม่อีกครั้ง' : 'ไม่สามารถส่งข้อความของคุณได้ กรุณาตรวจสอบเครือข่ายหรือ Webhook และลองใหม่อีกครั้ง',
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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'th-TH' // Thai language
      utterance.volume = volume / 100
      
      // Try to select a female voice for Thai
      const voices = speechSynthesis.getVoices()
      const thaiVoices = voices.filter(v => v.lang.startsWith('th'))
      if (thaiVoices.length > 0) {
        // Look for female voice
        let femaleVoice = thaiVoices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('woman') ||
          v.name.toLowerCase().includes('หญิง')
        )
        // If no explicit female, try the second voice (often female)
        if (!femaleVoice && thaiVoices.length > 1) {
          femaleVoice = thaiVoices[1]
        }
        // If still no, use first available
        if (!femaleVoice) {
          femaleVoice = thaiVoices[0]
        }
        if (femaleVoice) {
          utterance.voice = femaleVoice
        }
      }
      
      speechSynthesis.speak(utterance)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex-1 flex flex-col bg-background font-['Sarabun',sans-serif] overflow-x-hidden lg:max-w-4xl lg:mx-auto">
      {onToggleLeftPanel && (
        <button
          onClick={onToggleLeftPanel}
          className="p-2 self-start hover:bg-muted rounded"
          title="เปิด/ปิดเมนู"
        >
          <Menu size={24} />
        </button>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 sm:px-2 py-4 space-y-2 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-xl sm:text-2xl mb-2">เริ่มการปรึกษาด้านประกัน</p>
              <p className="text-lg sm:text-xl">ส่งข้อความหรือใช้ปุ่มเสียง</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`${
                  msg.type === 'user'
                    ? 'max-w-[80vw] sm:max-w-xs lg:max-w-lg'
                    : 'max-w-[85vw] sm:max-w-sm lg:max-w-xl'
                } px-4 sm:px-6 py-3 sm:py-4 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground border border-border'
                }`}
              >
                <p className="text-xl sm:text-lg leading-relaxed">{msg.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm opacity-75">{formatTime(msg.timestamp)}</span>
                  {msg.type === 'ai' && (
                    <div className="flex gap-1">
                      {msg.audio && (
                        <button
                          onClick={() => playAudio(msg.audio)}
                          className="p-1 rounded-full hover:bg-black/10 transition-colors"
                          title="ฟังเสียงจากเซิร์ฟเวอร์"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => speakText(msg.text)}
                        className="p-1 rounded-full hover:bg-black/10 transition-colors"
                        title="ฟังเสียงในเครื่อง"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {msg.audio && msg.type === 'user' && (
                  <button
                    onClick={() => playAudio(msg.audio!)}
                    className="mt-2 flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
                  >
                    <Volume2 size={14} />
                    เล่น
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground px-4 sm:px-6 py-3 sm:py-4 rounded-lg border border-border">
              <p className="text-lg sm:text-base">กำลังพิมพ์{typingDots}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-1 sm:p-4 bg-card">
        <div className="w-full sm:max-w-xl sm:mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 sm:p-4 rounded-lg transition-all text-white font-bold text-sm sm:text-lg ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title={isRecording ? 'คลิกเพื่อหยุดบันทึก' : 'คลิกเพื่อเริ่มบันทึก'}
          >
            <Mic size={18} className="sm:w-6 sm:h-6" />
            <span className="ml-2 text-sm sm:text-base">{isRecording ? 'หยุด' : 'พูด'}</span>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="พิมพ์ข้อความของคุณ..."
            className="flex-1 px-2 sm:px-4 py-2 sm:py-3 bg-input border border-input rounded-lg text-lg sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isRecording || isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isRecording || isLoading || !input.trim()}
            className="p-2 sm:p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        </div>
      </div>
      <audio ref={audioRef} />
    </div>
  )
}
