"use server"

import { cookies } from "next/headers"

// Calls the internal API route securely with server-only secret and user cookies
export async function generateObjectionsSecure(
  scriptContent: string,
  category: string = "cold_outreach"
): Promise<any> {
  if (!scriptContent?.trim()) {
    throw new Error("scriptContent is required")
  }

  const secret = process.env.OBJECTIONS_API_SECRET || process.env.API_SECRET
  if (!secret) {
    throw new Error("Server misconfiguration: OBJECTIONS_API_SECRET or API_SECRET is not set")
  }

  // Build absolute URL to our own app
  // Build absolute URL to our own app robustly
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  if (!baseUrl) {
    const vercel = process.env.VERCEL_URL
    if (vercel) {
      baseUrl = vercel.startsWith("http") ? vercel : `https://${vercel}`
    } else {
      baseUrl = "http://localhost:3000"
    }
  }

  const url = `${baseUrl}/api/generate-objections`

  // Forward current user's cookies so the API route can read Supabase session
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join("; ")

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": secret,
      // Forward cookies for user auth in the API route
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ scriptContent, category }),
    // Avoid caching dynamic user-specific calls
    cache: "no-store",
  })

  if (!res.ok) {
    let msg = `Failed to generate objections (${res.status})`
    try {
      const err = await res.json()
      if (err?.error) msg = err.error
    } catch {}
    throw new Error(msg)
  }

  return res.json()
}
