'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/chat-interface'
import LeftPanel from '@/components/left-panel'
import { ChatMessage } from '@/types'

export default function Home() {
  const [chats, setChats] = useState<Array<{ id: string; title: string; timestamp: string; messages: ChatMessage[] }>>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [volume, setVolume] = useState(50)

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem('insure-bot-chats')
      const savedVolume = localStorage.getItem('insure-bot-volume')
      if (savedChats) setChats(JSON.parse(savedChats))
      if (savedVolume) setVolume(parseInt(savedVolume))
    } catch (err) {
      console.error('Failed to load saved data from localStorage:', err)
      // If parsing or access fails, clear potentially corrupted keys
      try { localStorage.removeItem('insure-bot-chats') } catch {}
      try { localStorage.removeItem('insure-bot-volume') } catch {}
    }
  }, [])

  // Save chats to localStorage whenever they change
  useEffect(() => {
    const isQuotaExceeded = (e: any) => {
      if (!e) return false
      return (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        // numeric codes for older browsers
        e.code === 22 || e.code === 1014
      )
    }

    try {
      localStorage.setItem('insure-bot-chats', JSON.stringify(chats))
    } catch (err: any) {
      console.error('Failed to save chats to localStorage:', err)
      if (isQuotaExceeded(err)) {
        // Try to shrink the payload and retry: keep most recent chats, and trim messages per chat
        try {
          const maxChats = 10
          const maxMessagesPerChat = 10
          const trimmed = chats
            .slice(0, maxChats)
            .map(c => ({ ...c, messages: c.messages ? c.messages.slice(-maxMessagesPerChat) : [] }))
          localStorage.setItem('insure-bot-chats', JSON.stringify(trimmed))
          // update in-memory to the trimmed version so UI matches stored data
          setChats(trimmed)
        } catch (err2) {
          console.error('Failed to save trimmed chats to localStorage:', err2)
          try { localStorage.removeItem('insure-bot-chats') } catch {}
          setChats([])
        }
      }
    }
  }, [chats])

  // Save volume to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('insure-bot-volume', volume.toString())
  }, [volume])

  const createNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      timestamp: new Date().toLocaleString(),
      messages: [],
    }
    setChats([newChat, ...chats])
    setCurrentChatId(newChatId)
  }

  const deleteChat = (id: string) => {
    setChats(chats.filter(chat => chat.id !== id))
    if (currentChatId === id) {
      setCurrentChatId(chats.length > 1 ? chats[0].id : null)
    }
  }

  const selectChat = (id: string) => {
    setCurrentChatId(id)
  }

  const updateChatMessages = (messages: ChatMessage[]) => {
    // When persisting messages, only keep audio for the current chat and
    // only the most recent user and ai audio blobs to save storage space.
    const sanitizeMessagesForStorage = (msgs: ChatMessage[], isCurrent: boolean) => {
      if (!isCurrent) {
        // For non-current chats remove all audio references
        return msgs.map(m => ({ ...m, audio: undefined }))
      }

      // For current chat: keep only the latest user audio and the latest ai audio
      let latestUserAudioId: string | null = null
      let latestAiAudioId: string | null = null

      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i]
        if (!latestUserAudioId && m.type === 'user' && m.audio) latestUserAudioId = m.id
        if (!latestAiAudioId && m.type === 'ai' && m.audio) latestAiAudioId = m.id
        if (latestUserAudioId && latestAiAudioId) break
      }

      return msgs.map(m => {
        if (m.type === 'user') {
          return { ...m, audio: m.id === latestUserAudioId ? m.audio : undefined }
        }
        if (m.type === 'ai') {
          return { ...m, audio: m.id === latestAiAudioId ? m.audio : undefined }
        }
        return { ...m, audio: undefined }
      })
    }

    setChats(chats.map(chat =>
      chat.id === currentChatId
        ? {
            ...chat,
            messages: sanitizeMessagesForStorage(messages, true),
            title: messages[0]?.text?.substring(0, 30) || 'New Chat',
          }
        : {
            ...chat,
            messages: sanitizeMessagesForStorage(chat.messages || [], false),
          }
    ))
  }

  const currentChat = chats.find(chat => chat.id === currentChatId)

  return (
    <div className="flex h-screen bg-background">
      <LeftPanel
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        volume={volume}
        onVolumeChange={setVolume}
      />
      {currentChatId ? (
        <ChatInterface
          chatMessages={currentChat?.messages || []}
          onMessagesUpdate={updateChatMessages}
          volume={volume}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome to Insure Bot</h1>
            <p className="mb-6">Start a new chat to begin your insurance consultation</p>
            <button
              onClick={createNewChat}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Start New Chat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
