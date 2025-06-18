"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Clock, FileText, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DeepScanSuccessPage() {
  const [timeRemaining, setTimeRemaining] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = '/dashboard'
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="text-center">
          <CardHeader className="pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl text-green-700 dark:text-green-300">
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Your deep security scan has been initiated and is now processing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center mb-3">
                <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  Scan In Progress
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Our AI and security experts are now analyzing your website. This process typically takes 15-30 minutes.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div className="flex items-start space-x-3 p-4 bg-card border rounded-lg">
                <Clock className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Processing Time</h3>
                  <p className="text-xs text-muted-foreground">
                    Most scans complete within 15-30 minutes. Complex sites may take up to 1 hour.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-card border rounded-lg">
                <Mail className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Email Notification</h3>
                  <p className="text-xs text-muted-foreground">
                    You'll receive an email when your scan is complete with your security report.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-card border rounded-lg">
                <FileText className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Detailed Report</h3>
                  <p className="text-xs text-muted-foreground">
                    Your comprehensive security analysis will be available in your dashboard.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-card border rounded-lg">
                <CheckCircle className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Next Steps</h3>
                  <p className="text-xs text-muted-foreground">
                    If you selected codebase analysis, please email your code to lorik@securevibing.com
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to dashboard in {timeRemaining} seconds...
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/tools">
                    View All Tools
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 