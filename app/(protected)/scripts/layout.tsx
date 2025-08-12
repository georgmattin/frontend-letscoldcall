import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Scripts',
}

export default function ScriptsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
