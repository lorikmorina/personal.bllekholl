"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CreditCard, X, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface BillingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentPlan: string
  subscriptionStatus?: string
}

export default function BillingModal({ isOpen, onClose, userId, currentPlan, subscriptionStatus }: BillingModalProps) {
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
        title: "Subscription Cancellation Scheduled",
        description: "Your subscription has been scheduled for cancellation. You'll retain access until the end of your billing period.",
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

  const isPaidPlan = currentPlan === 'monthly' || currentPlan === 'yearly'
  const isCancelled = subscriptionStatus === 'cancelled'
  const isActive = subscriptionStatus === 'active'

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
              {currentPlan === 'monthly' 
                ? 'You are on the monthly subscription plan ($19/month).'
                : currentPlan === 'yearly'
                ? 'You are on the yearly subscription plan ($159/year).'
                : 'You are on the free plan.'}
            </div>
            
            {/* Show cancellation status */}
            {isCancelled && isPaidPlan && (
              <div className="mt-3 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">Cancellation Scheduled</span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  Your subscription is scheduled to cancel at the end of your billing period. You'll retain full access until then.
                </p>
              </div>
            )}
          </div>
          
          {/* Show cancellation option for active paid plans */}
          {isPaidPlan && isActive && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">Cancel Subscription</h3>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-3 rounded-md flex items-start gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  Cancelling will schedule your subscription to end at the end of your current billing period. You'll retain full access until then.
                </div>
              </div>
            </div>
          )}

          {/* Show information for cancelled subscriptions */}
          {isCancelled && isPaidPlan && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">Subscription Status</h3>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 p-3 rounded-md flex items-start gap-2 text-sm">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Cancellation in progress</p>
                  <p>Your subscription will automatically end at the conclusion of your current billing period. No further charges will be made.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          
          {/* Only show cancel button for active paid plans */}
          {isPaidPlan && isActive && (
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