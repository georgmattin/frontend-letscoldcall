import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Calling',
}

export default function CallingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
