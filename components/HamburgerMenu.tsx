'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import { useRouter } from 'next/navigation'
import LoginModal from './LoginModal'

interface HamburgerMenuProps {
  onAddMember?: () => void
  hideEditButton?: boolean // 編集ボタンを非表示にするフラグ
}

export default function HamburgerMenu({ onAddMember, hideEditButton = false }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [shouldRedirectAfterLogin, setShouldRedirectAfterLogin] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const { isEditMode, enableEditMode, disableEditMode, hasUnsavedChanges } = useEdit()
  const { confirmAction } = useNotification()
  const router = useRouter()

  const handleMemberOnlyClick = () => {
    if (isAuthenticated) {
      router.push('/reports')
      setIsOpen(false)
    } else {
      setShouldRedirectAfterLogin(true)
      setShowLoginModal(true)
    }
  }

  const handleLoginClick = () => {
    setShouldRedirectAfterLogin(false)
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
      if (hasUnsavedChanges) {
        confirmAction({
          title: '編集の終了',
          message: '未保存の変更があります。保存せずに終了しますか？',
          confirmLabel: '終了する',
          variant: 'danger',
          onConfirm: () => {
            disableEditMode()
            setIsOpen(false)
          }
        })
        return
      }
      disableEditMode()
      setIsOpen(false)
    } else {
      enableEditMode()
      // 編集モード開始時はメニューを開いたままにする
    }
  }

  const handleAddMember = () => {
    if (onAddMember) {
      onAddMember()
      setIsOpen(false)
    }
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
        className={`fixed top-0 right-0 h-full bg-white shadow-xl z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        style={{ width: 'max-content', minWidth: '100px', maxWidth: '110px' }}
      >
        <div className="px-1 py-4 pt-20">
          <nav className="space-y-3">
            <button
              onClick={() => {
                router.push('/')
                setIsOpen(false)
              }}
              className="w-full text-left px-2 py-2 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors text-sm"
            >
              メンバー一覧
            </button>

            {!isAuthenticated ? (
              <button
                onClick={handleLoginClick}
                className="w-full text-left px-2 py-2 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors text-sm"
              >
                ログイン
              </button>
            ) : (
              <div className="px-2 py-2 text-green-600 font-semibold text-sm">
                ログイン中
              </div>
            )}

            <button
              onClick={handleMemberOnlyClick}
              className="w-full text-left px-2 py-2 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors text-sm"
            >
              メンバー限定
            </button>

            <button
              onClick={() => {
                router.push('/ideas')
                setIsOpen(false)
              }}
              className="w-full text-left px-2 py-2 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-primary transition-colors text-sm"
            >
              アイデア宝庫
            </button>

            {isAuthenticated && (
              <>
                {!hideEditButton && (
                  <button
                    onClick={handleEditToggle}
                    className={`w-full text-left px-2 py-2 rounded-lg transition-colors text-sm ${isEditMode
                      ? 'bg-orange-100 text-orange-primary font-semibold'
                      : 'hover:bg-orange-50 text-gray-700 hover:text-orange-primary'
                      }`}
                  >
                    {isEditMode ? '編集中...' : '編集する'}
                  </button>
                )}

                {!hideEditButton && isEditMode && onAddMember && (
                  <button
                    onClick={handleAddMember}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors font-semibold text-sm"
                  >
                    メンバー追加
                  </button>
                )}

                {hideEditButton && onAddMember && (
                  <button
                    onClick={handleAddMember}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors font-semibold text-sm"
                  >
                    メンバー追加
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors text-sm"
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
          onClose={() => {
            setShowLoginModal(false)
            setShouldRedirectAfterLogin(false)
          }}
          onSuccess={() => {
            setShowLoginModal(false)
            setIsOpen(false)
            setShouldRedirectAfterLogin(false)
          }}
          redirectTo={shouldRedirectAfterLogin ? '/reports' : undefined}
        />
      )}
    </>
  )
}
