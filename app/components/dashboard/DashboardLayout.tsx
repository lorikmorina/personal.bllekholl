"use client"

import { motion } from "framer-motion"
import DashboardSidebar from "./DashboardSidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTool: string
  setActiveTool: (tool: string) => void
}

export default function DashboardLayout({
  children,
  activeTool,
  setActiveTool
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background pt-16">
      <DashboardSidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      
      <main className="flex-1 p-6 lg:p-8 lg:pl-[calc(16rem+2rem)] w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-5xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
} 