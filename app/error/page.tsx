import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Viga</CardTitle>
          <CardDescription>
            Autentimisel tekkis viga. Palun proovige uuesti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Kui probleem püsib, võtke meiega ühendust.
            </p>
            <Link href="/login">
              <Button className="w-full">
                Tagasi sisselogimisele
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 