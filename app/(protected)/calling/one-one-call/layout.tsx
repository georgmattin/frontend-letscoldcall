import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'One-on-one Call',
}

export default function OneOneCallLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
