import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { EditProvider } from '@/contexts/EditContext'
import HamburgerMenu from '@/components/HamburgerMenu'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'O-range - メンバー紹介',
  description: '活動を見える化するWebサイト',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <EditProvider>
            <HamburgerMenu />
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>
          </EditProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
