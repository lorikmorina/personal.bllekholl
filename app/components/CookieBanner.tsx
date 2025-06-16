"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Cookie, Settings, Shield, BarChart, Users, X } from "lucide-react"
import Link from "next/link"

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  personalization: boolean
}

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
    personalization: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookie-consent')
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    }
    setPreferences(allAccepted)
    saveCookiePreferences(allAccepted)
    setIsVisible(false)
  }

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    }
    setPreferences(necessaryOnly)
    saveCookiePreferences(necessaryOnly)
    setIsVisible(false)
  }

  const handleSavePreferences = () => {
    saveCookiePreferences(preferences)
    setIsVisible(false)
  }

  const saveCookiePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }))

    // Here you would typically initialize your analytics, marketing tools, etc.
    // based on the user's preferences
    if (prefs.analytics) {
      // Initialize Google Analytics, etc.
      console.log('Analytics cookies enabled')
    }
    if (prefs.marketing) {
      // Initialize marketing pixels, etc.
      console.log('Marketing cookies enabled')
    }
    if (prefs.personalization) {
      // Initialize personalization tools
      console.log('Personalization cookies enabled')
    }
  }

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return // Can't disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      >
        <Card className="mx-auto max-w-4xl bg-card/95 backdrop-blur-md border-border shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Cookie Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Cookie className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-1">
                {!showDetails ? (
                  // Simple View
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">We value your privacy</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                        By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or learn more about our practices in our{" "}
                        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleAcceptAll}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Accept All
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleAcceptNecessary}
                        className="border-border"
                      >
                        Necessary Only
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowDetails(true)}
                        className="hover:bg-accent"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Customize
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Detailed View
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Cookie Preferences</h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowDetails(false)}
                        className="hover:bg-accent"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Choose which cookies you'd like to accept. You can change these settings at any time.
                    </p>

                    <div className="space-y-4">
                      {/* Necessary Cookies */}
                      <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                        <div className="flex items-start gap-3 flex-1">
                          <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-sm">Necessary Cookies</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Essential for website functionality and security. Cannot be disabled.
                            </p>
                          </div>
                        </div>
                        <Switch checked={true} disabled className="opacity-50" />
                      </div>

                      <Separator />

                      {/* Analytics Cookies */}
                      <div className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-lg transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <BarChart className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-sm">Analytics Cookies</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Help us understand how visitors interact with our website.
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={preferences.analytics}
                          onCheckedChange={() => togglePreference('analytics')}
                        />
                      </div>

                      {/* Marketing Cookies */}
                      <div className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-lg transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-sm">Marketing Cookies</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Used to deliver personalized advertisements relevant to you.
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={preferences.marketing}
                          onCheckedChange={() => togglePreference('marketing')}
                        />
                      </div>

                      {/* Personalization Cookies */}
                      <div className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-lg transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <Settings className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-sm">Personalization Cookies</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Enable customized content and remember your preferences.
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={preferences.personalization}
                          onCheckedChange={() => togglePreference('personalization')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                      <Button 
                        onClick={handleSavePreferences}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Save Preferences
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleAcceptAll}
                        className="border-border"
                      >
                        Accept All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook to check if cookies are accepted (for use in other components)
export const useCookieConsent = () => {
  const [consent, setConsent] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie-consent')
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent)
        setConsent(parsed.preferences)
      } catch (error) {
        console.error('Error parsing cookie consent:', error)
      }
    }
  }, [])

  return consent
}

// Function to reset cookie preferences (for use in privacy policy page)
export const resetCookieConsent = () => {
  localStorage.removeItem('cookie-consent')
  // Reload the page to show the banner again
  window.location.reload()
}

// Function to get current cookie preferences
export const getCookiePreferences = (): CookiePreferences | null => {
  try {
    const savedConsent = localStorage.getItem('cookie-consent')
    if (savedConsent) {
      const parsed = JSON.parse(savedConsent)
      return parsed.preferences
    }
  } catch (error) {
    console.error('Error getting cookie preferences:', error)
  }
  return null
} 