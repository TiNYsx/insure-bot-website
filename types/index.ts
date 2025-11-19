export interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  text: string
  audio?: string
  timestamp: string
}

export interface AdminConfig {
  username: string
  password: string
  webhookUrl: string
}
