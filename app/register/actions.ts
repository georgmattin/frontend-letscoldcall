'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Kontrolli parooli pikkust
  if (password.length < 6) {
    redirect('/register?message=Password must be at least 6 characters')
  }

  const data = {
    email: email,
    password: password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/register?message=Registration failed: ' + error.message)
  }

  // Saada teavituse e-kiri uue kasutaja kohta (asünkroonselt)
  // Ei oota vastust, et mitte blokeerida registreerimist
  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'
  
  // Fire-and-forget e-kirja saatmine
  fetch(`${origin}/api/notifications/new-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName,
      lastName,
      email
    })
  }).then(() => {
    console.log('📧 Uue kasutaja teavituse e-kiri käivitatud:', email)
  }).catch((emailError) => {
    console.error('❌ Viga teavituse e-kirja saatmisel:', emailError)
  })

  revalidatePath('/', 'layout')
  redirect(`/verify-email?email=${encodeURIComponent(email)}`)
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`
    }
  })

  if (error) {
    console.error('Google OAuth error:', error)
    redirect('/register?message=Google registreerimine ebaõnnestus')
  }

  if (data.url) {
    redirect(data.url)
  }
} 