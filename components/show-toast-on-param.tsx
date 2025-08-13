"use client"

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export default function ShowToastOnParam() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const msg = searchParams.get('msg')
    if (!msg) return

    if (msg === 'package_required') {
      toast({
        title: 'Package required',
        description: 'Please activate a package to use Calling.',
        variant: 'destructive',
      })
      // Clean the URL to avoid showing again on refresh
      router.replace('/dashboard')
    }
  }, [router, searchParams, toast])

  return null
}
