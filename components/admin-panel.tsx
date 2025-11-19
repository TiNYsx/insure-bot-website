'use client'

import { useState, useEffect } from 'react'
import { Save, LogOut, Settings, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface AdminPanelProps {
  onLogout: () => void
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')

  useEffect(() => {
    const config = localStorage.getItem('admin-config')
    if (config) {
      const parsed = JSON.parse(config)
      setWebhookUrl(parsed.webhookUrl || '')
      setUsername(parsed.username || 'root')
      setPassword(parsed.password || 'admin')
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    const config = {
      webhookUrl,
      username: newUsername || username,
      password: newPassword || password,
    }
    localStorage.setItem('admin-config', JSON.stringify(config))
    setUsername(newUsername || username)
    setPassword(newPassword || password)
    setNewUsername('')
    setNewPassword('')
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">
              IB
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Insure Bot Admin</h1>
              <p className="text-xs text-muted-foreground">Configuration Panel</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              Back to Chat
            </Link>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Webhook Configuration */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Webhook Configuration</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                n8n Webhook URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hook.n8n.cloud/webhook/xxxxx"
                className="w-full px-4 py-2 bg-input border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This URL will receive POST requests with chat messages and audio from users.
              </p>
            </div>
          </div>

          {/* Authentication Configuration */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Change Admin Credentials</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Username
                </label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground opacity-60 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="w-full px-4 py-2 bg-input border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="w-full px-4 py-2 bg-input border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save and Status */}
          {saveSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                Configuration saved successfully!
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
