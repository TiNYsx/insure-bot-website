'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'

interface AdminLoginProps {
  onLogin: (success: boolean) => void
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Default credentials
  const DEFAULT_USERNAME = 'root'
  const DEFAULT_PASSWORD = 'admin'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Get stored credentials or use defaults
    const storedConfig = localStorage.getItem('admin-config')
    let correctUsername = DEFAULT_USERNAME
    let correctPassword = DEFAULT_PASSWORD

    if (storedConfig) {
      const config = JSON.parse(storedConfig)
      correctUsername = config.username
      correctPassword = config.password
    }

    if (username === correctUsername && password === correctPassword) {
      onLogin(true)
    } else {
      setError('Invalid username or password')
    }

    setIsLoading(false)
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            <LogIn size={24} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-foreground">Admin Panel</h1>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          Manage Insure Bot configuration
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root"
              className="w-full px-4 py-2 bg-input border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-input border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Default: username: <strong>root</strong> / password: <strong>admin</strong>
        </p>
      </div>
    </div>
  )
}
