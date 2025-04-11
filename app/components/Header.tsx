"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline"
import { Menu, X } from "lucide-react"

export default function Header() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <span className="sr-only">SecureVibing</span>
            <img
              className="h-8 w-auto"
              src="/securevibingLogo.svg"
              alt="SecureVibing Logo"
            />
            <span className="text-lg font-semibold">SecureVibing</span>
          </Link>
        </div>
        
        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-secondary/20"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
        
        {/* Desktop navigation */}
        <div className="hidden lg:flex gap-x-12">
          <Link
            href="/pricing"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/signup"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
          >
            Signup
          </Link>
          <Link
            href="/learn"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
          >
            Learn Free
          </Link>
          <Link
    href="/dashboard"
    rel="noopener noreferrer"
    className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
  >
    Dashboard
  </Link>
        </div>
        
        {/* Desktop theme toggle */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          )}
        </div>
      </nav>
      
      {/* Mobile menu, show/hide based on menu state */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="lg:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-1 px-4 pb-5 pt-2 border-t border-border/10">
              <Link
                href="/pricing"
                className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/signup"
                className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Signup
              </Link>
              <Link
                href="/learn"
                className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Learn Free
              </Link>
              
              {/* Mobile theme toggle */}
              {mounted && (
                <div className="px-3 py-2">
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex w-full items-center gap-x-2 rounded-md py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                  >
                    {theme === "dark" ? (
                      <>
                        <SunIcon className="h-5 w-5 text-primary" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <MoonIcon className="h-5 w-5 text-primary" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

