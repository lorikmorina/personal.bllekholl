"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Script from "next/script"
import { useToast } from "@/hooks/use-toast"

declare global {
  interface Window {
    Paddle: any;
  }
}

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: (plan: string) => Promise<void>
}

export default function PaywallModal({ isOpen, onClose, onUpgrade }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly') // Default to yearly (previously lifetime)
  const [isLoading, setIsLoading] = useState(false)
  const [paddleLoaded, setPaddleLoaded] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  
  // State to track if this modal initiated the checkout
  const checkoutInitiated = useRef(false);
  const userRef = useRef<any>(null); // Ref to hold user object for the callback
  
  // Initialize Paddle and set up event listener
  useEffect(() => {
    if (window.Paddle && !paddleLoaded) {
      // Set environment if in sandbox mode
      if (process.env.NEXT_PUBLIC_PADDLE_SANDBOX_MODE === 'true') {
        window.Paddle.Environment.set("sandbox");
      }
      
      // Initialize Paddle with client-side token AND event callback
      window.Paddle.Initialize({ 
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        eventCallback: async (eventData: any) => {
          console.log('Paddle Event: ', eventData);
          
          // Check if checkout was completed AND initiated by this modal instance
          if (eventData.name === "checkout.completed" && checkoutInitiated.current) {
            console.log("Checkout completed event received for this modal (Client-Side)", eventData);
            
            try {
              // Extract plan from custom data for UI feedback
              const plan = eventData.data?.custom_data?.plan || selectedPlan; // Fallback to state

              if (!plan) {
                console.warn("Could not determine Plan from event data or state for UI feedback.");
                // Proceed anyway, webhook is source of truth
              }

              // --- REMOVED SUPABASE UPDATE LOGIC --- 
              // The webhook handler (app/api/webhooks/paddle/route.ts) is now responsible 
              // for updating the database with plan, subscription ID, and status.
              
              // Show success toast
              toast({
                title: "Payment Successful!",
                description: `Your upgrade to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is processing. You'll see the changes shortly.`,
                duration: 5000,
              });
              
              // Call parent callbacks for UI updates
              await onUpgrade(plan);

            } catch (error) {
              // This catch block now mainly handles errors in UI updates/callbacks
              console.error("Error processing checkout.completed event on client-side:", error);
              toast({
                title: "Payment Processed",
                description: "Your payment went through, but there was a client-side issue updating the view. Please refresh the page.",
                variant: "destructive", // Use a less severe tone? Maybe just default.
                duration: 5000,
              });
            } finally {
              checkoutInitiated.current = false; // Reset tracker
              userRef.current = null; // Clear user ref
              setIsLoading(false); // Stop the main button loading indicator
            }
          }
        }
      });
      
      setPaddleLoaded(true);
    }

    // Cleanup function (optional but good practice)
    return () => {
      // Potentially remove event listeners if Paddle.js provides a way
      // Reset state if component unmounts during checkout
      checkoutInitiated.current = false;
      userRef.current = null;
    };
  }, [paddleLoaded, supabase, toast, onUpgrade, onClose, selectedPlan]); // Add dependencies used in callback
  
  const getPriceId = () => {
    return selectedPlan === 'monthly' 
      ? process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID  // This env var now points to monthly price
      : process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID; // This env var now points to yearly price
  };
  
  const handleUpgrade = async () => {
    if (!selectedPlan || !paddleLoaded) return;
    
    setIsLoading(true);
    checkoutInitiated.current = false; // Ensure clean state before starting
    userRef.current = null;
    
    try {
      // Get the currently authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false); // Stop loading if no user
        throw new Error("User not authenticated");
      }
      
      userRef.current = user; // Store user info for the event callback
      checkoutInitiated.current = true; // Mark that checkout is initiated by this modal
      
      // Close the modal immediately before opening Paddle
      onClose();

      // Open Paddle checkout - REMOVED the success callback here
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: getPriceId(),
            quantity: 1
          }
        ],
        customer: {
          email: user.email
        },
        customData: {
          // Keep sending custom data - might be useful for webhooks/backup
          userId: user.id,
          plan: selectedPlan
        },
        // REMOVED success callback
        closeCallback: () => {
          // If checkout is closed manually *before* completion, reset state
          if (checkoutInitiated.current) { 
            console.log("Paddle checkout closed manually before completion.");
            checkoutInitiated.current = false;
            userRef.current = null;
            setIsLoading(false); // Stop loading indicator
          }
        }
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
      checkoutInitiated.current = false; // Reset on error
      userRef.current = null;
      setIsLoading(false);
      
      toast({
        title: "Payment Error",
        description: "There was a problem initiating the payment process. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
    // Note: setIsLoading(false) is handled by the eventCallback or closeCallback now
  };
  
  return (
    <>
      {/* Load Paddle JS SDK (v2) - Keep this */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={() => {
          // Initialization logic moved to useEffect
        }}
        strategy="lazyOnload" // Ensures it loads after main content
      />
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Get unlimited scans and premium features with our Pro plans
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Monthly Plan */}
            <div 
              className={`border rounded-lg p-5 cursor-pointer hover:border-primary/80 transition-all ${
                selectedPlan === 'monthly' ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedPlan('monthly')}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">Monthly</h3>
                <Badge variant="secondary">Most Popular</Badge>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">$9</span>
                <span className="text-muted-foreground">/month</span>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">Includes a 7-day free trial</p>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Unlimited website scans</span>
                </li>
                
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>API leak detection</span>
                </li>
               
              </ul>
            </div>
            
            {/* Yearly Plan */}
            <div 
              className={`border rounded-lg p-5 cursor-pointer hover:border-primary/80 transition-all ${
                selectedPlan === 'yearly' ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedPlan('yearly')}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">Yearly</h3>
                <Badge variant="outline">Best Value</Badge>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">$199</span>
                <span className="text-muted-foreground"> per year</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Everything in Monthly plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Save with annual billing</span>
                </li>
                
              </ul>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground mt-4">
            Start with a 7-day free trial on the monthly plan. Cancel anytime before the trial ends, and you won't be charged.
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpgrade} 
              disabled={isLoading || !paddleLoaded} // Disable if Paddle not loaded
              className="min-w-[120px]"
            >
              {isLoading ? 'Processing...' : 'Upgrade Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 