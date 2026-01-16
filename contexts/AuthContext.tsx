'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  loading: boolean
  currentMemberId: string | null
  currentMemberName: string | null
  login: (id: string, memberId: string, memberName: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [currentMemberName, setCurrentMemberName] = useState<string | null>(null)

  useEffect(() => {
    // ページ読み込み時にログイン状態を確認
    const authStatus = localStorage.getItem('isAuthenticated')
    const memberId = localStorage.getItem('currentMemberId')
    const memberName = localStorage.getItem('currentMemberName')
    
    if (authStatus === 'true' && memberId && memberName) {
      setIsAuthenticated(true)
      setCurrentMemberId(memberId)
      setCurrentMemberName(memberName)
    }
    
    setLoading(false)
  }, [])

  const login = (id: string, memberId: string, memberName: string) => {
    // シンプルなID認証（本番環境では適切な認証を実装）
    const validIds = ['admin', 'orange-admin', 'o-range']
    
    if (validIds.includes(id.toLowerCase())) {
      setIsAuthenticated(true)
      setCurrentMemberId(memberId)
      setCurrentMemberName(memberName)
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('currentMemberId', memberId)
      localStorage.setItem('currentMemberName', memberName)
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    setCurrentMemberId(null)
    setCurrentMemberName(null)
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentMemberId')
    localStorage.removeItem('currentMemberName')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, currentMemberId, currentMemberName, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
