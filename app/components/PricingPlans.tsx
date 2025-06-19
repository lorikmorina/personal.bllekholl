"use client"

import { motion } from "framer-motion"
import { Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function PricingPlans() {
  const plans = [
    {
      name: "One-Time Scan",
      price: "$4",
      description: "Perfect for quick security assessments",
      billingPeriod: "per scan",
      features: [
        "Comprehensive deep security scan",
        "API key & leak detection",
        "Database configuration analysis",
        "Security header verification", 
        "Subdomain discovery",
        "AI-powered security recommendations",
      ],
      cta: "Get Single Scan",
      mostPopular: false,
      isOneTime: true,
    },
    {
      name: "Monthly",
      price: "$19",
      description: "Perfect for individuals who need regular website scanning",
      billingPeriod: "per month",
      annualPrice: "",
      features: [
        "Unlimited security scans",
        "API key detection",
        "RLS Configuration Detection",
        "Security header analysis",
        "Subdomain finder",
        "Database deep scan tools",
        "Priority processing",
      ],
      cta: "Start Monthly",
      mostPopular: true,
    },
    {
      name: "Yearly",
      price: "$159",
      description: "Best value for dedicated developers",
      billingPeriod: "per year",
      features: [
        "Unlimited security scans",
        "API key detection", 
        "RLS Configuration Detection",
        "Security header analysis",
        "Subdomain finder",
        "Database deep scan tools",
        "Priority support",
        "2 months free",
      ],
      cta: "Start Yearly",
      mostPopular: false,
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Choose Your Security Plan
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground">
            From one-time scans to unlimited access - find the perfect plan for your security needs.
            No hidden fees or complicated pricing tiers.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-8 lg:gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
              className={`relative ${plan.mostPopular ? "md:-mt-8" : ""}`}
            >
              {plan.mostPopular && (
                <div className="absolute -top-5 inset-x-0 flex justify-center">
                  <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                    Most Popular
                  </span>
                </div>
              )}

              <Card className={`h-full border ${plan.mostPopular ? "border-primary shadow-lg" : ""} ${plan.isOneTime ? "border-blue-200" : ""}`}>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center">
                    {plan.isOneTime && <Zap className="w-5 h-5 mr-2 text-blue-500" />}
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-extrabold tracking-tight">
                        {plan.price}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {plan.billingPeriod}
                      </span>
                    </div>
                    {plan.annualPrice && (
                      <div className="mt-1">
                        <span className="text-sm text-muted-foreground">
                          {plan.annualPrice}
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mr-3" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch">
                  <Button 
                    asChild 
                    className="w-full" 
                    variant={plan.mostPopular ? "default" : plan.isOneTime ? "outline" : "outline"}
                  >
                    <Link href={plan.isOneTime ? "/dashboard" : "/signup"}>
                      {plan.cta}
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {plan.isOneTime ? "No subscription" : "Access all tools now"}
                  </p>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Information Section */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-muted/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Not sure which plan to choose?</h3>
            <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
              <div>
                <h4 className="font-semibold text-lg mb-2 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-500" />
                  Choose One-Time Scan if:
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• You need a quick security assessment</li>
                  <li>• You want to test our service first</li>
                  <li>• You only scan occasionally</li>
                  <li>• You prefer pay-as-you-go pricing</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Choose Subscription if:</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• You need regular security monitoring</li>
                  <li>• You manage multiple websites</li>
                  <li>• You want unlimited access to all tools</li>
                  <li>• You prefer predictable monthly costs</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 