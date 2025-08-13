// Simple shared store for the active Twilio connection
// This avoids relying on window globals and lets pages hydrate UI after redirects.
let activeConnection: any = null

export function setActiveConnection(conn: any) {
  activeConnection = conn || null
  // Also mirror to window to avoid multiple-bundle singleton issues
  try {
    if (typeof window !== 'undefined') {
      ;(window as any).__twilioActiveConnection = activeConnection
    }
  } catch {}
}

export function getActiveConnection(): any {
  // Prefer local module state, but fall back to window in case of different bundles
  if (activeConnection) return activeConnection
  try {
    if (typeof window !== 'undefined' && (window as any).__twilioActiveConnection) {
      return (window as any).__twilioActiveConnection
    }
  } catch {}
  return null
}

export function clearActiveConnection() {
  activeConnection = null
  try {
    if (typeof window !== 'undefined') {
      ;(window as any).__twilioActiveConnection = null
    }
  } catch {}
}
