# Supabase Autentimise Seadistus

See projekt kasutab Supabase autentimist kasutades uusimat `@supabase/ssr` paketti, mis asendab aegunud auth-helpers'id.

## Eeltingimused

1. Supabase konto ja projekt
2. Node.js ja npm/pnpm

## Seadistamine

### 1. Supabase Projekt

1. Minge [supabase.com](https://supabase.com) ja looge uus projekt
2. Kopeerige oma projekti URL ja anon key

### 2. Keskkonna Muutujad

Uuendage `.env.local` faili oma Supabase andmetega:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. E-posti Mallid

Supabase dashboardis minge Auth > Templates ja muutke "Confirm signup" malli:

Muutke `{{ .ConfirmationURL }}` järgmiseks:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Kasutamine

### Sisselogimine
- Minge `/login` lehele
- Sisestage e-post ja parool
- Vajutage "Logi sisse"

### Registreerimine
- Minge `/login` lehele  
- Vajutage "Loo konto" linki
- See viib teid `/register` lehele
- Sisestage e-post, parool ja kinnita parool
- Vajutage "Loo konto"
- Kontrollige e-posti kinnituse saamiseks
- Klikkige kinnituse lingil e-postis
- Nüüd saate sisse logida

### Väljalogimine
- Kasutage AuthUser komponenti või `logout` action'i

## Autentimise Voog

1. **Uus kasutaja:**
   - `/login` → vajutab "Loo konto" → `/register`
   - Täidab registreerumise vormi (e-post + parool 2x)
   - Saab e-postile kinnituse lingi
   - Klikkib lingil → `/auth/confirm` → suunatakse `/dashboard`

2. **Olemasolev kasutaja:**
   - `/login` → sisestab andmed → `/dashboard`

## Komponendid

- `utils/supabase/client.ts` - Klientpoolne Supabase klient
- `utils/supabase/server.ts` - Serverpoolne Supabase klient  
- `utils/supabase/middleware.ts` - Middleware seanside värskendamiseks
- `middleware.ts` - Next.js middleware
- `components/auth-user.tsx` - Kasutaja info ja väljalogimine
- `app/login/` - Sisselogimise leht ja action'id
- `app/register/` - Registreerumise leht ja action'id
- `app/auth/confirm/` - E-posti kinnituse endpoint

## Turvalisus

- Kasutage alati `supabase.auth.getUser()` lehekülgede kaitsmiseks
- Ärge kunagi usaldage `supabase.auth.getSession()` serveripoolses koodis
- Middleware värskendab automaatselt expired token'eid
- Paroolide kinnitus toimub server-side
- Minimaalne parooli pikkus: 6 tähemärki

## Vigade Käitlemine

- Login ja register leheküljed kuvavad vigasid URL query parameetri kaudu
- Vigade näited:
  - "Paroolid ei ühti"
  - "Parool peab olema vähemalt 6 tähemärki"
  - "Sisselogimine ebaõnnestus"
  - "Kontrollige oma e-posti kinnituse saamiseks!"

## Näited

### Server Component'is kasutaja kontroll:
```tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    redirect('/login')
  }
  
  return <div>Kaitstud sisu: {data.user.email}</div>
}
```

### Client Component'is:
```tsx
'use client'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function ClientComponent() {
  const [user, setUser] = useState(null)
  const supabase = createClient()
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])
  
  return <div>{user?.email}</div>
}
``` 