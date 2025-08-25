import type { Metadata } from 'next'
import Script from 'next/script'
import { ThemeProvider } from '@/components/ThemeProvider'
import { FetchInterceptorProvider } from '@/components/FetchInterceptorProvider'
import './globals.css'

export const metadata: Metadata = {
  title: '🎯 Банк Желаний',
  description: 'Система управления желаниями для пар',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 min-h-screen antialiased transition-colors duration-300">
        <Script 
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          <FetchInterceptorProvider>
            {children}
          </FetchInterceptorProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}