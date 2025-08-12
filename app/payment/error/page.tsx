"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  XCircle, 
  ArrowLeft, 
  CreditCard, 
  RefreshCw,
  HelpCircle,
  Mail
} from 'lucide-react'

export default function PaymentErrorPage() {
  const [errorType, setErrorType] = useState<'cancelled' | 'failed' | 'unknown'>('unknown')
  const [message, setMessage] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const cancelled = params.get('cancelled')
    
    if (cancelled === 'true') {
      setErrorType('cancelled')
      setMessage('Payment was cancelled. No charges were made to your account.')
    } else if (error) {
      setErrorType('failed')
      setMessage(decodeURIComponent(error))
    } else {
      setErrorType('unknown')
      setMessage('An unknown error occurred during payment processing.')
    }
  }, [])

  const handleRetryPayment = () => {
    router.push('/onboarding')
  }

  const handleGoBack = () => {
    router.push('/onboarding')
  }

  const handleContactSupport = () => {
    // You can replace this with your actual support email or contact system
    window.location.href = 'mailto:support@yourcompany.com?subject=Payment Issue&body=I encountered an issue with payment processing.'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <CardTitle className="text-2xl text-red-800">
              {errorType === 'cancelled' && 'Payment Cancelled'}
              {errorType === 'failed' && 'Payment Failed'}
              {errorType === 'unknown' && 'Payment Issue'}
            </CardTitle>
            
            <CardDescription className="text-lg">
              {errorType === 'cancelled' && 'Your payment was cancelled'}
              {errorType === 'failed' && 'There was an issue processing your payment'}
              {errorType === 'unknown' && 'Something went wrong'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {message}
              </AlertDescription>
            </Alert>

            {errorType === 'cancelled' && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-blue-900">What happened?</h3>
                <p className="text-sm text-blue-800">
                  You cancelled the payment process before completing it. No charges were made to your account.
                </p>
              </div>
            )}

            {errorType === 'failed' && (
              <div className="bg-yellow-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-yellow-900">Common causes:</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Insufficient funds</li>
                  <li>• Card declined by bank</li>
                  <li>• Incorrect card details</li>
                  <li>• Card expired</li>
                  <li>• International payment restrictions</li>
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">What can you do?</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                  <span>Try again with the same or different payment method</span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-green-600" />
                  <span>Check your card details and try again</span>
                </div>
                <div className="flex items-center">
                  <HelpCircle className="w-4 h-4 mr-2 text-purple-600" />
                  <span>Contact your bank if payment keeps failing</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-orange-600" />
                  <span>Contact our support team for assistance</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRetryPayment} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Payment Again
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleGoBack}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                
                <Button 
                  onClick={handleContactSupport}
                  variant="outline"
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500">
                Need help? Our support team is available 24/7 to assist you.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 