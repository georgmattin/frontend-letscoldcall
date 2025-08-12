'use client'

import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/logout/actions'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

export default function AuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  if (loading) {
    return <div>Laen...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-600">
        Tere, {user.email}
      </span>
      <form action={logout}>
        <Button variant="outline" size="sm" type="submit">
          Logi välja
        </Button>
      </form>
    </div>
  )
} 