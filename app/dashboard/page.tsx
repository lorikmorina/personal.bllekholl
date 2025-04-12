"use client"

import { useState } from "react"
import DashboardLayout from "@/app/components/dashboard/DashboardLayout"
import LightScanTool from "@/app/components/dashboard/tools/LightScanTool"
import ReportsList from "@/app/components/dashboard/reports/ReportsList"
import DashboardProvider from "@/app/components/dashboard/DashboardProvider"

export default function DashboardPage() {
  const [activeTool, setActiveTool] = useState("light-scan")
  
  return (
    <DashboardProvider>
      <DashboardLayout 
        activeTool={activeTool}
        setActiveTool={setActiveTool}
      >
        {activeTool === "light-scan" && <LightScanTool />}
        {activeTool === "reports" && <ReportsList />}
      </DashboardLayout>
    </DashboardProvider>
  )
} 