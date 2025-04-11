"use client"

import { useState } from "react"
import DashboardLayout from "@/app/components/dashboard/DashboardLayout"
import LightScanTool from "@/app/components/dashboard/tools/LightScanTool"

export default function DashboardPage() {
  const [activeTool, setActiveTool] = useState("light-scan")
  
  return (
    <DashboardLayout 
      activeTool={activeTool}
      setActiveTool={setActiveTool}
    >
      {activeTool === "light-scan" && <LightScanTool />}
    </DashboardLayout>
  )
} 