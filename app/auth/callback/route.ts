import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Fetch user's onboarding status
      const { data: userRes } = await supabase.auth.getUser()
      const userId = userRes.user?.id
      let destination = '/onboarding'
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_status')
          .eq('id', userId)
          .maybeSingle()
        const done = (profile?.onboarding_status || '').toLowerCase() === 'yes'
        destination = done ? '/dashboard' : '/onboarding'
      }

      // Determine the correct base URL to redirect to, preferring explicit env config
      const envBase = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
      const forwardedHost = request.headers.get('x-forwarded-host') || ''
      const headerBase = forwardedHost ? `${forwardedProto}://${forwardedHost}` : ''
      const baseUrl = envBase || headerBase || origin

      return NextResponse.redirect(`${baseUrl}${destination}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Google sisselogimine ebaõnnestus`)
}
