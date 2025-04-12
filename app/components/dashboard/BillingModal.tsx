"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CreditCard, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface BillingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentPlan: string
}

export default function BillingModal({ isOpen, onClose, userId, currentPlan }: BillingModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleCancelSubscription = async () => {
    setIsLoading(true)
    
    try {
      // Call our API endpoint to cancel the subscription
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription')
      }
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll have access until the end of your billing period.",
        duration: 5000,
      })
      
      onClose()
      
      // Reload the page to reflect changes
      window.location.reload()
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: "Error",
        description: "There was a problem cancelling your subscription. Please contact support.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <DialogDescription>
            Manage your current subscription plan and billing details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-6 p-4 rounded-lg bg-muted">
            <div className="font-medium mb-1">Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</div>
            <div className="text-sm text-muted-foreground">
              {currentPlan === 'yearly' 
                ? 'You are on the yearly subscription plan ($24/year).'
                : currentPlan === 'lifetime'
                ? 'You have lifetime access to all features.'
                : 'You are on the free plan.'}
            </div>
          </div>
          
          {currentPlan === 'yearly' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">Cancel Subscription</h3>
                <p className="text-sm text-muted-foreground">
                  If you cancel, you'll still have access until the end of your current billing period.
                </p>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-3 rounded-md flex items-start gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  Cancelling will stop future billing but you'll lose access when your current period ends.
                </div>
              </div>
            </div>
          )}
          
          {currentPlan === 'lifetime' && (
            <div className="bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 p-3 rounded-md flex items-start gap-2 text-sm">
              <CreditCard className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                You have lifetime access to all features with no recurring payments.
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          
          {currentPlan === 'yearly' && (
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 