'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?message=Sisselogimine ebaõnnestus')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/login?message=Registreerimine ebaõnnestus')
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Kontrollige oma e-posti kinnituse saamiseks')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  // Prefer explicit env-configured base URL; fallback to request origin; then localhost for dev
  const requestOrigin = headersList.get('origin') || ''
  const baseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin ||
    'http://localhost:3000'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback`
    }
  })

  if (error) {
    console.error('Google OAuth error:', error)
    redirect('/login?message=Google sisselogimine ebaõnnestus')
  }

  if (data.url) {
    redirect(data.url)
  }
}