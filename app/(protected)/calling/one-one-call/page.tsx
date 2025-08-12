"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OneOneCallRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const contactId = params.get("contactId") || ""
    const listId = params.get("listId") || ""
    const callHistoryId = params.get("callHistoryId") || ""
    const phoneNumber = params.get("phoneNumber") || ""

    // Build target URL to reuse the main calling experience in single-contact mode
    const query = new URLSearchParams()
    query.set('mode', 'single')
    if (contactId) query.set('contactId', contactId)
    if (listId) query.set('listId', listId)
    if (callHistoryId) query.set('callHistoryId', callHistoryId)
    if (phoneNumber) query.set('phoneNumber', phoneNumber)
    const target = `/calling?${query.toString()}`

    router.replace(target)
  }, [router])

  // Minimal placeholder while redirecting
  return (
    <div className="w-full h-[60vh] flex items-center justify-center text-sm text-gray-500">
      Preparing your one-on-one call...
    </div>
  )
}
