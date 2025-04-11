"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Shield, Settings, BarChart3, Users, Menu, X, LogOut, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline"

interface DashboardSidebarProps {
  activeTool: string
  setActiveTool: (tool: string) => void
}

export default function DashboardSidebar({ activeTool, setActiveTool }: DashboardSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const tools = [
    {
      id: "light-scan",
      name: "Light Scan",
      icon: <Shield className="w-5 h-5" />,
      description: "Quick security scan for websites"
    }
  ]
  
  // Future tools that can be added later
  const futureTools = [
    {
      id: "deep-scan",
      name: "Deep Scan",
      icon: <BarChart3 className="w-5 h-5" />,
      description: "Comprehensive security analysis",
      comingSoon: true
    },
    {
      id: "team-management",
      name: "Team",
      icon: <Users className="w-5 h-5" />,
      description: "Manage team access",
      comingSoon: true
    }
  ]
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  
  return (
    <>
      {/* Mobile sidebar toggle - Moved below header */}
      <div className="lg:hidden fixed top-16 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
        </button>
      </div>
      
      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:w-64 flex-shrink-0`}
        initial={false}
      >
        <div className="h-full flex flex-col">
          {/* Logo and brand */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            
            
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tools navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase px-3 mb-3">
                Tools
              </h3>
              
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    activeTool === tool.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary/10"
                  }`}
                >
                  <span className="mr-3">{tool.icon}</span>
                  <span>{tool.name}</span>
                </button>
              ))}
              
              {/* Future tools (coming soon) */}
              {futureTools.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase px-3 mb-3 mt-6">
                    Coming Soon
                  </h3>
                  
                  {futureTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="w-full flex items-center px-3 py-2 text-sm rounded-md text-muted-foreground"
                    >
                      <span className="mr-3">{tool.icon}</span>
                      <span>{tool.name}</span>
                      <span className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded">Soon</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          
          {/* User and actions */}
          <div className="px-3 py-4 border-t border-border">
            {/* Theme toggle - Fix hydration mismatch */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center px-3 py-2 text-sm rounded-md text-foreground hover:bg-secondary/10 mb-2"
            >
              {mounted && theme === "dark" ? (
                <>
                  <SunIcon className="w-5 h-5 mr-3" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <MoonIcon className="w-5 h-5 mr-3" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
            
            {/* Settings */}
            <button className="w-full flex items-center px-3 py-2 text-sm rounded-md text-foreground hover:bg-secondary/10 mb-2">
              <Settings className="w-5 h-5 mr-3" />
              <span>Settings</span>
            </button>
            
            {/* Logout */}
            <button className="w-full flex items-center px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
} 