"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { 
  Calendar, 
  Mail, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Bell
} from "lucide-react"

export default function PeriodicScans() {
  const router = useRouter()

  const scanFrequencies = [
    {
      frequency: "Daily",
      icon: <Zap className="h-5 w-5" />,
      description: "Perfect for high-traffic production sites",
      badge: "Most Popular",
      badgeColor: "bg-blue-500"
    },
    {
      frequency: "Weekly", 
      icon: <Calendar className="h-5 w-5" />,
      description: "Ideal for most business websites",
      badge: "Recommended",
      badgeColor: "bg-green-500"
    },
    {
      frequency: "Monthly",
      icon: <Clock className="h-5 w-5" />,
      description: "Great for personal projects and blogs",
      badge: null,
      badgeColor: ""
    }
  ]

  const benefits = [
    {
      icon: <Bell className="h-6 w-6 text-blue-500" />,
      title: "Instant Email Alerts",
      description: "Get notified immediately when new vulnerabilities are detected on your website"
    },
    {
      icon: <Shield className="h-6 w-6 text-green-500" />,
      title: "24/7 Security Monitoring",
      description: "Continuous protection with automated scans running in the background"
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-orange-500" />,
      title: "Early Threat Detection",
      description: "Catch security issues before they become expensive data breaches"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-purple-500" />,
      title: "Compliance Reports",
      description: "Detailed security reports for compliance audits and stakeholder updates"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Calendar className="mr-1 h-3 w-3" />
            Automated Security Monitoring
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Never Miss a Security Issue with{" "}
            <span className="text-gradient">Periodic Scans</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Set up automated website security scans that run daily, weekly, or monthly. 
            Get instant email notifications when vulnerabilities are detected, so you can 
            fix issues before they cost you money or customers.
          </p>
        </motion.div>

        {/* Scan Frequency Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          {scanFrequencies.map((scan, index) => (
            <Card 
              key={scan.frequency}
              className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                scan.badge === "Most Popular" ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20" :
                scan.badge === "Recommended" ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
                "border-border hover:border-primary/50"
              }`}
            >
              {scan.badge && (
                <Badge className={`absolute top-4 right-4 ${scan.badgeColor} text-white`}>
                  {scan.badge}
                </Badge>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {scan.icon}
                  </div>
                  <CardTitle className="text-xl">{scan.frequency} Scans</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {scan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Automated vulnerability scanning
                  </li>
                  <li className="flex items-center">
                    <Mail className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                    Email reports delivered to inbox
                  </li>
                  <li className="flex items-center">
                    <Shield className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0" />
                    Security trend monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center p-6 rounded-xl bg-card/50 border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-background rounded-full border border-border">
                  {benefit.icon}
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="bg-card border border-border rounded-2xl p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">
            Start Automated Security Monitoring Today
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of developers who trust SecureVibing to monitor their websites 24/7. 
            Prevent costly security breaches with proactive monitoring and instant alerts.
          </p>
          <Button 
            size="lg"
            onClick={() => router.push('/signup')}
            className="bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white rounded-full px-8"
          >
            Setup Periodic Scans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
} 