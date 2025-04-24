"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Shield, BarChart3, Users, Menu, X, LogOut, ChevronRight, Bell, Clipboard, FileText, Globe, Home, Settings, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import { useDashboard } from "./DashboardProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import BillingModal from "./BillingModal"

interface DashboardSidebarProps {
  activeTool: string
  setActiveTool: (tool: string) => void
}

export default function DashboardSidebar({ activeTool, setActiveTool }: DashboardSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user, signOut } = useDashboard()
  const supabase = createClient()
  const [customerPortalUrl, setCustomerPortalUrl] = useState('')
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)

  // Fetch user profile including subscription plan
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        setUserProfile(data)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserProfile()
  }, [user, supabase])

  useEffect(() => {
    const getCustomerPortalUrl = async () => {
      try {
        // For subscribed users, direct them to Paddle's portal
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('subscription_plan')
            .eq('id', user.id)
            .single()
            
          // If user has a paid plan, they should have access to the Paddle portal
          // If they're on free plan, we'll use our previous billing page
          if (data?.subscription_plan && data.subscription_plan !== 'free') {
            setCustomerPortalUrl('https://customer.paddle.com/login')
          } else {
            setCustomerPortalUrl('/dashboard/billing')
          }
        }
      } catch (error) {
        console.error('Error determining portal URL:', error)
        setCustomerPortalUrl('/dashboard/billing')
      }
    }
    
    getCustomerPortalUrl()
  }, [supabase])

  // Extract user initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.email) return "U"
    const email = user.email
    return email.substring(0, 2).toUpperCase()
  }

  // Format subscription plan for display
  const formatSubscriptionPlan = () => {
    if (isLoading) return "Loading..."
    if (!userProfile) return "Free Plan" // Fallback
    
    const plan = userProfile.subscription_plan || "free"
    
    // Return "Free Plan" if the plan is free, otherwise return "Premium Plan"
    return plan === 'free' ? "Free Plan" : "Premium Plan"
  }

  // In the navigation array, update to make Reports a tool instead of a direct link
  const navigation = [
    {
      name: "Overview",
      value: "overview",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "Security Scan",
      value: "lightscan",
      icon: <Globe className="h-5 w-5" />,
    },
    {
      name: "Reports",
      value: "reports", // Now this is a tool value, not a direct link
      icon: <FileText className="h-5 w-5" />,
    },
    // ... other navigation items ...
  ]

  return (
    <>
      {/* Mobile menu button - adjusted top position */}
      <button
        type="button"
        className="fixed top-[4.5rem] left-4 z-40 rounded-md bg-primary/10 p-2 text-primary lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
        <span className="sr-only">Open sidebar</span>
      </button>
      
      {/* Sidebar - adjusted positioning */}
      <motion.aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-card shadow-xl transition-transform lg:translate-x-0 lg:border-r lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        initial={false}
      >
        <div className="flex h-full flex-col py-6">
          {/* User info */}
          {user && (
            <div className="px-4 mb-6">
              <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
                <Avatar>
                  <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{formatSubscriptionPlan()}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 px-3">
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground">
                TOOLS
              </h3>
              <button 
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                  activeTool === 'light-scan' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-foreground hover:bg-secondary/10'
                }`}
                onClick={() => setActiveTool('light-scan')}
              >
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-3" />
                  <span>Light Scan</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* AI-assisted scan button - disabled and greyed out */}
              <div className="relative">
                <button 
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-muted-foreground cursor-not-allowed opacity-50"
                  disabled
                >
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-3" />
                    <span>AI-assisted Scan</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <Badge 
                  variant="secondary" 
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] py-0 px-1.5"
                >
                  Coming Soon
                </Badge>
              </div>
              
              <button 
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                  activeTool === 'reports' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-foreground hover:bg-secondary/10'
                }`}
                onClick={() => setActiveTool('reports')}
              >
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3" />
                  <span>Reports</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              
            </div>
          </div>
          
          <div className="px-3 py-4 border-t border-border">
            {/* Billing Button - Added above Logout */}
            <button 
              className="w-full flex items-center px-3 py-2 text-sm rounded-md text-foreground hover:bg-secondary/10 mb-2"
              onClick={() => setIsBillingModalOpen(true)}
            >
              <CreditCard className="w-5 h-5 mr-3" />
              <span>Billing</span>
            </button>
            
            {/* Logout - existing button */}
            <button 
              className="w-full flex items-center px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {user && userProfile && (
        <BillingModal
          isOpen={isBillingModalOpen}
          onClose={() => setIsBillingModalOpen(false)}
          userId={user.id}
          currentPlan={userProfile.subscription_plan || 'free'}
        />
      )}
    </>
  )
} 