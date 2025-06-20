"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/dashboard/DashboardLayout"
import LightScanTool from "@/app/components/dashboard/tools/LightScanTool"
import SupabaseCheckTool from "@/app/components/dashboard/tools/SupabaseCheckTool"
import SubdomainFinderTool from "@/app/components/dashboard/tools/SubdomainFinderTool"
import SupabaseDeepScanTool from "@/app/components/dashboard/tools/SupabaseDeepScanTool"
import DomainsManagement from "@/app/components/dashboard/tools/DomainsManagement"
import ReportsList from "@/app/components/dashboard/reports/ReportsList"
import DeepScanTool from "@/app/components/dashboard/tools/DeepScanTool"
import DashboardProvider, { useDashboard } from "@/app/components/dashboard/DashboardProvider"
import PaywallModal from "@/app/components/dashboard/PaywallModal"
import { createClient } from "@/lib/supabase/client"

function DashboardContent() {
  const [activeTool, setActiveTool] = useState("deep-scan") // Default to free tool
  const [isLoading, setIsLoading] = useState(true)
  const [showPaywallModal, setShowPaywallModal] = useState(false)
  const { user } = useDashboard()
  const supabase = createClient()

  // Set default tool based on user subscription status
  useEffect(() => {
    const setDefaultTool = async () => {
      if (!user) {
        setActiveTool("deep-scan") // Default for non-logged users
        setIsLoading(false)
        return
      }

      try {
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching user profile:', error)
          setActiveTool("deep-scan") // Fallback to free tool
        } else {
          // Set default tool based on subscription
          const isPremium = userProfile?.subscription_plan && userProfile.subscription_plan !== 'free'
          setActiveTool(isPremium ? "light-scan" : "deep-scan")
          
          // Show paywall modal for free users on first visit
          if (!isPremium) {
            const hasSeenPaywall = localStorage.getItem(`paywall_seen_${user.id}`)
            if (!hasSeenPaywall) {
              setShowPaywallModal(true)
              localStorage.setItem(`paywall_seen_${user.id}`, 'true')
            }
          }
        }
      } catch (error) {
        console.error('Error determining default tool:', error)
        setActiveTool("deep-scan") // Fallback to free tool
      } finally {
        setIsLoading(false)
      }
    }

    setDefaultTool()
  }, [user, supabase])

  const handleClosePaywall = () => {
    setShowPaywallModal(false)
  }

  const handleUpgrade = async (plan: string) => {
    // Handle upgrade logic - this could trigger a refresh or update the user state
    console.log(`Upgraded to ${plan}`)
    setShowPaywallModal(false)
    // You might want to refresh the user profile or trigger a re-fetch here
    window.location.reload() // Simple approach to refresh and update subscription status
  }

  // Don't render content until we've determined the default tool
  if (isLoading) {
    return (
      <DashboardLayout 
        activeTool={activeTool}
        setActiveTool={setActiveTool}
      >
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout 
      activeTool={activeTool}
      setActiveTool={setActiveTool}
    >
      {activeTool === "domains" && <DomainsManagement />}
      {activeTool === "light-scan" && <LightScanTool />}
      {activeTool === "supabase-check" && <SupabaseCheckTool />}
      {activeTool === "subdomain-finder" && <SubdomainFinderTool />}
      {activeTool === "supabase-deep-scan" && <SupabaseDeepScanTool />}
      {activeTool === "reports" && <ReportsList />}
      {activeTool === "deep-scan" && <DeepScanTool />}
      
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={handleClosePaywall}
        onUpgrade={handleUpgrade}
      />
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
} 