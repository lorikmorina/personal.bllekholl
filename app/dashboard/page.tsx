"use client"

import { useState } from "react"
import DashboardLayout from "@/app/components/dashboard/DashboardLayout"
import LightScanTool from "@/app/components/dashboard/tools/LightScanTool"
import SupabaseCheckTool from "@/app/components/dashboard/tools/SupabaseCheckTool"
import SubdomainFinderTool from "@/app/components/dashboard/tools/SubdomainFinderTool"
import SupabaseDeepScanTool from "@/app/components/dashboard/tools/SupabaseDeepScanTool"
import DomainsManagement from "@/app/components/dashboard/tools/DomainsManagement"
import ReportsList from "@/app/components/dashboard/reports/ReportsList"
import DeepScanTool from "@/app/components/dashboard/tools/DeepScanTool"
import DashboardProvider from "@/app/components/dashboard/DashboardProvider"

export default function DashboardPage() {
  const [activeTool, setActiveTool] = useState("light-scan")
  
  return (
    <DashboardProvider>
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
      </DashboardLayout>
    </DashboardProvider>
  )
} 