'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ConfirmOptions {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
    variant?: 'danger' | 'primary'
}

interface NotificationContextType {
    showToast: (type: ToastType, message: string) => void
    confirmAction: (options: ConfirmOptions) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null)

    const showToast = useCallback((type: ToastType, message: string) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prev) => [...prev, { id, type, message }])

        // 3秒後に消去
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    const confirmAction = useCallback((options: ConfirmOptions) => {
        setConfirmOptions(options)
    }, [])

    const handleConfirm = () => {
        if (confirmOptions) {
            confirmOptions.onConfirm()
            setConfirmOptions(null)
        }
    }

    const handleCancel = () => {
        if (confirmOptions) {
            if (confirmOptions.onCancel) confirmOptions.onCancel()
            setConfirmOptions(null)
        }
    }

    return (
        <NotificationContext.Provider value={{ showToast, confirmAction }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-right-full duration-300 min-w-[300px] ${toast.type === 'success' ? 'bg-white/90 border-green-100 text-gray-800' :
                                toast.type === 'error' ? 'bg-white/90 border-red-100 text-gray-800' :
                                    'bg-white/90 border-blue-100 text-gray-800'
                            }`}
                    >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${toast.type === 'success' ? 'bg-green-100 text-green-600' :
                                toast.type === 'error' ? 'bg-red-100 text-red-600' :
                                    'bg-blue-100 text-blue-600'
                            }`}>
                            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}
                        </div>
                        <p className="font-semibold text-sm">{toast.message}</p>
                    </div>
                ))}
            </div>

            {/* Confirmation Dialog */}
            {confirmOptions && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmOptions.title}</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">{confirmOptions.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            >
                                {confirmOptions.cancelLabel || 'キャンセル'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl transition-colors font-medium shadow-md hover:shadow-lg ${confirmOptions.variant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-orange-primary hover:bg-orange-dark'
                                    }`}
                            >
                                {confirmOptions.confirmLabel || '確定'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    )
}

export function useNotification() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider')
    }
    return context
}
