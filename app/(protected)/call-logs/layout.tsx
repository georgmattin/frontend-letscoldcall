import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Call Logs',
}

export default function CallLogsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
