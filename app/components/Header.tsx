"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline"
import { Menu, X, User, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import BillingModal from "@/app/components/dashboard/BillingModal"

export default function Header() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState('free')
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)

      // If user is logged in, fetch their subscription plan
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('subscription_plan')
            .eq('id', session.user.id)
            .single()
          
          if (!error && data) {
            setUserPlan(data.subscription_plan || 'free')
          }
        } catch (error) {
          console.error('Error fetching user plan:', error)
        }
      }
    }
    
    getInitialSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleSignOut = async () => {
    // Clear all session data, including on all devices
    await supabase.auth.signOut({ scope: 'global' })
    
    // Add a small delay before redirect to ensure auth state is cleared
    setTimeout(() => {
      // Force a hard refresh to clear any cached state
      window.location.href = '/'
    }, 100)
  }

  // Extract user initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.email) return "U"
    const email = user.email
    return email.substring(0, 2).toUpperCase()
  }

  const openBillingModal = () => {
    setIsBillingModalOpen(true)
  }

  const closeBillingModal = () => {
    setIsBillingModalOpen(false)
  }

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
          {!user && (
            <Link
              href="/signup"
              rel="noopener noreferrer"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Signup
            </Link>
          )}
          <Link
            href="/learn"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
          >
            Learn Free
          </Link>
          {user && (
            <Link
              href="/dashboard"
              rel="noopener noreferrer"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
        
        {/* Desktop right section */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-4 items-center">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          )}
          
          {/* User menu (when logged in) */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-secondary/20 p-1 cursor-pointer">
                  <Avatar>
                    <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openBillingModal}>
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Login button when not logged in */}
          {!user && !loading && (
            <Link href="/signup" passHref>
              <Button variant="default" size="sm">
                <User className="h-4 w-4 mr-2" />
                Login
              </Button>
            </Link>
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
              
              {!user && (
                <Link
                  href="/signup"
                  className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Signup
                </Link>
              )}
              
              <Link
                href="/learn"
                className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Learn Free
              </Link>
              
              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  
                  <button
                    onClick={() => {
                      openBillingModal();
                      setMobileMenuOpen(false);
                    }}
                    className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-secondary/20 text-left w-full"
                  >
                    Billing
                  </button>
                  
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-md px-3 py-2 text-base font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    <span>Logout</span>
                  </button>
                </>
              )}
              
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

      {/* BillingModal */}
      {user && (
        <BillingModal 
          isOpen={isBillingModalOpen} 
          onClose={closeBillingModal} 
          userId={user.id} 
          currentPlan={userPlan}
        />
      )}
    </motion.header>
  )
}

