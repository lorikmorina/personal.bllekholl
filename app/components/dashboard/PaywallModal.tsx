"use client"

import { useState, useEffect } from "react"
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
  const [selectedPlan, setSelectedPlan] = useState<string>('lifetime') // Default to lifetime
  const [isLoading, setIsLoading] = useState(false)
  const [paddleLoaded, setPaddleLoaded] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  
  // Initialize Paddle when the script loads
  useEffect(() => {
    if (window.Paddle && !paddleLoaded) {
      // Set environment if in sandbox mode
      if (process.env.NEXT_PUBLIC_PADDLE_SANDBOX_MODE === 'true') {
        window.Paddle.Environment.set("sandbox");
      }
      
      // Initialize Paddle with client-side token
      window.Paddle.Initialize({ 
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
      });
      
      setPaddleLoaded(true);
    }
  }, [paddleLoaded]);
  
  const getPriceId = () => {
    return selectedPlan === 'yearly' 
      ? process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID 
      : process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;
  };
  
  const handleUpgrade = async () => {
    if (!selectedPlan || !paddleLoaded) return;
    
    setIsLoading(true);
    
    try {
      // Get the currently authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Open Paddle checkout with v2 API
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
          userId: user.id,
          plan: selectedPlan
        },
        success: {
          callback: async (data: any) => {
            console.log("Payment successful", data);
            
            try {
              // Extract subscription info from Paddle V2 response (Check console log if this path is incorrect)
              const subscriptionId = data?.data?.id || null; // Assuming Paddle V2 structure
              
              // Update user's subscription in Supabase with subscription ID and status
              const { error } = await supabase
                .from('profiles')
                .update({ 
                  subscription_plan: selectedPlan,
                  paddle_subscription_id: subscriptionId, // Use the correct column name
                  subscription_status: 'active', // You might want to manage status via webhooks too
                  updated_at: new Date().toISOString() // Good practice to add updated_at
                })
                .eq('id', user.id);
              
              if (error) throw error;
              
              // Show success toast notification
              toast({
                title: "Subscription Upgraded Successfully!",
                description: `You've been upgraded to the ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan.`,
                duration: 5000,
              });
              
              // Call the onUpgrade callback to update parent component state
              await onUpgrade(selectedPlan);
              
              // Close the modal only after successful processing
              onClose();
              
            } catch (error) {
              console.error("Error updating subscription:", error);
              toast({
                title: "Error Updating Subscription",
                description: "Your payment was successful, but we had trouble updating your account. Please refresh the page.",
                variant: "destructive",
                duration: 5000,
              });
            }
          }
        },
        closeCallback: () => {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      setIsLoading(false);
      
      toast({
        title: "Payment Error",
        description: "There was a problem with the payment process. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  return (
    <>
      {/* Load Paddle JS SDK (v2) */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={() => {
          if (window.Paddle) {
            // Set environment if in sandbox mode
            if (process.env.NEXT_PUBLIC_PADDLE_SANDBOX_MODE === 'true') {
              window.Paddle.Environment.set("sandbox");
            }
            
            // Initialize Paddle with client-side token
            window.Paddle.Initialize({ 
              token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
            });
            
            setPaddleLoaded(true);
          }
        }}
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
            {/* Yearly Plan */}
            <div 
              className={`border rounded-lg p-5 cursor-pointer hover:border-primary/80 transition-all ${
                selectedPlan === 'yearly' ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedPlan('yearly')}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">Yearly</h3>
                <Badge variant="secondary">Most Popular</Badge>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">$24</span>
                <span className="text-muted-foreground">/year</span>
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
            
            {/* Lifetime Plan */}
            <div 
              className={`border rounded-lg p-5 cursor-pointer hover:border-primary/80 transition-all ${
                selectedPlan === 'lifetime' ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedPlan('lifetime')}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">Lifetime</h3>
                <Badge variant="outline">Best Value</Badge>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">$49</span>
                <span className="text-muted-foreground"> one-time</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Everything in Yearly plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Lifetime updates</span>
                </li>
                
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpgrade} 
              disabled={isLoading}
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