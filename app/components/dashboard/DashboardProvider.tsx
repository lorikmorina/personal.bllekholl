"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client" 
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

type DashboardContextType = {
  user: any | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {},
})

export const useDashboard = () => useContext(DashboardContext)

export default function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
      
      if (!user) {
        router.push('/signup')
      }
    }
    
    getUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/')
      } else if (session?.user) {
        setUser(session.user)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <DashboardContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </DashboardContext.Provider>
  )
} 