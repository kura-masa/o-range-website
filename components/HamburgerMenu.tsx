'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useRouter } from 'next/navigation'
import LoginModal from './LoginModal'

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const { isEditMode, enableEditMode, disableEditMode } = useEdit()
  const router = useRouter()

  const handleMemberOnlyClick = () => {
    if (isAuthenticated) {
      router.push('/reports')
      setIsOpen(false)
    } else {
      setShowLoginModal(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginModal(true)
  }

  const handleLogout = () => {
    logout()
    disableEditMode() // ログアウト時は編集モードも解除
    setIsOpen(false)
    router.push('/')
  }

  const handleEditToggle = () => {
    if (isEditMode) {
      disableEditMode()
    } else {
      enableEditMode()
    }
    setIsOpen(false)
  }

  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-orange-primary text-white p-3 rounded-lg shadow-lg hover:bg-orange-dark transition-colors"
        aria-label="メニュー"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* メニューオーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* メニューパネル */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 pt-20">
          <nav className="space-y-4">
            <button
              onClick={() => {
                router.push('/')
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors"
            >
              メンバー一覧
            </button>

            {!isAuthenticated ? (
              <button
                onClick={handleLoginClick}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors"
              >
                管理者ログイン
              </button>
            ) : (
              <div className="px-4 py-3 text-green-600 font-semibold">
                ログインしています
              </div>
            )}

            <button
              onClick={handleMemberOnlyClick}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors"
            >
              メンバー限定情報
            </button>

            {isAuthenticated && (
              <>
                <button
                  onClick={handleEditToggle}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    isEditMode
                      ? 'bg-orange-100 text-orange-primary font-semibold'
                      : 'hover:bg-orange-50 text-gray-700 hover:text-orange-primary'
                  }`}
                >
                  {isEditMode ? '編集中...' : '編集する'}
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                >
                  ログアウト
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* ログインモーダル */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false)
            setIsOpen(false)
          }}
        />
      )}
    </>
  )
}
