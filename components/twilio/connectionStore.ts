// Simple shared store for the active Twilio connection
// This avoids relying on window globals and lets pages hydrate UI after redirects.
let activeConnection: any = null

export function setActiveConnection(conn: any) {
  activeConnection = conn || null
}

export function getActiveConnection(): any {
  return activeConnection
}

export function clearActiveConnection() {
  activeConnection = null
}
