import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'WeColdCall',
  description: 'Best Cold Calling Platform',
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="et">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
