import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ArrowUpCircle } from "lucide-react"

interface PackageLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  currentUsage?: number
  limit?: number
  featureName: string
  onUpgrade?: () => void
}

export function PackageLimitDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  currentUsage, 
  limit, 
  featureName,
  onUpgrade 
}: PackageLimitDialogProps) {
  
  const handleUpgrade = () => {
    onOpenChange(false)
    if (onUpgrade) {
      onUpgrade()
    } else {
      // Default redirect to pricing/subscription page
      window.location.href = '/payment/success' // Adjust this to your actual upgrade page
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  Te olete jõudnud oma paketi piiranguni: <strong>{featureName}</strong>
                </p>
                {currentUsage !== undefined && limit !== undefined && (
                  <p className="text-sm text-gray-600">
                    Kasutatud: {currentUsage} / {limit}
                  </p>
                )}
                <p className="text-sm">
                  Jätkamiseks valige suurem pakett või ostke lisafunktsioone.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Sule
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Uuenda paketti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 