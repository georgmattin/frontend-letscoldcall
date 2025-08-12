import { createClient } from '@/utils/supabase/client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET

class APIClient {
  private supabase = createClient()

  private async getAccessToken(): Promise<string> {
    const { data: { session } } = await this.supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available. Please log in.')
    }
    return session.access_token
  }

  async call(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken()
    
    if (!API_SECRET) {
      throw new Error('API secret not configured')
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-secret': API_SECRET,
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please refresh the page and log in again.')
      }
      if (response.status === 403) {
        throw new Error('Access denied. Please check your permissions.')
      }
      if (response.status === 404 && data.error?.includes('Configuration not found')) {
        throw new Error('Twilio configuration not found. Please configure your settings first.')
      }
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }

    return data
  }

  // Twilio Configuration Methods
  async getTwilioConfig() {
    return this.call('/api/user/twilio-config')
  }

  async saveTwilioConfig(config: any) {
    return this.call('/api/user/twilio-config', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async testTwilioConnection() {
    return this.call('/api/user/test-twilio')
  }

  // Access Token Method
  async getAccessTokenForTwilio() {
    return this.call('/api/access-token')
  }

  // Make Call Method
  async makeCall(phoneNumber: string, additionalData?: any) {
    return this.call('/api/make-call', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        ...additionalData
      })
    })
  }
}

// Export singleton instance
export const apiClient = new APIClient()
export default apiClient 