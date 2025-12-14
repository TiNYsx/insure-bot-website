'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
import { ChatMessage } from '@/types'

interface LeftPanelProps {
  chats: Array<{ id: string; title: string; timestamp: string; messages: ChatMessage[] }>
  currentChatId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
  volume: number
  onVolumeChange: (volume: number) => void
  isOpen: boolean
  onClose: () => void
}

export default function LeftPanel({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  volume,
  onVolumeChange,
  isOpen,
  onClose,
}: LeftPanelProps) {
  const [showSettings, setShowSettings] = useState(false)

  const formatThaiDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const thaiYear = date.getFullYear() + 543 // Buddhist Era
    const monthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const day = date.getDate()
    const month = monthNames[date.getMonth()]
    const year = thaiYear.toString().slice(-2) // Last two digits
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    return `${day} ${month} ${year} ${time}`
  }

  return (
    <div className={`w-64 bg-card border-r border-border flex flex-col h-screen shadow-sm absolute left-0 top-0 z-10 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {isOpen && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 z-20"
          title="ปิดเมนู"
        >
          ✕
        </button>
      )}
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <span className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold">
            SSO
          </span>
          SSO Chatbot
        </h1>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          สร้างแชทใหม่
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2">
        {chats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            ยังไม่มีแชท สร้างแชทใหม่ได้เลย!
          </div>
        ) : (
          chats.map(chat => (
            <div
              key={chat.id}
              className={`p-3 rounded-lg cursor-pointer transition-all group ${
                currentChatId === chat.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted border border-transparent'
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-card-foreground">
                    {chat.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatThaiDate(chat.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings Section */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full text-left text-sm font-medium text-card-foreground hover:text-primary transition-colors"
        >
          การตั้งค่า
        </button>
        {showSettings && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-2">
                เสียง: {volume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <a
              href="/admin"
              className="block text-xs text-primary hover:text-primary/80 transition-colors"
            >
              แผงควบคุมผู้ดูแล →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
