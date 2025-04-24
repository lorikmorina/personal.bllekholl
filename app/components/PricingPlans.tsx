"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function PricingPlans() {
  const plans = [
    {
      name: "Monthly",
      price: "$9",
      description: "Perfect for individuals who need regular website scanning",
      billingPeriod: "per month",
      annualPrice: "or $99 annually",
      features: [
        "1 month access to securevibing",
        "API key detection",
        "RLS Configuration Detection",
        "Security header analysis",
        "Fast Processing",
      ],
      cta: "Get SecureVibing",
      mostPopular: false,
    },
    {
      name: "Lifetime",
      price: "$199",
      description: "Best value for long term developers",
      billingPeriod: "one-time payment",
      features: [
        "Unlimited website scans",
        "API key detection",
        "RLS Configuration Detection",
        "Security header analysis",
        "Priority support",
      ],
      cta: "Get SecureVibing",
      mostPopular: true,
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
            Access Unlimited Scans
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground">
            Choose the plan that works best for your security needs.
            No hidden fees or complicated pricing tiers.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 gap-8 lg:gap-12"
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

              <Card className={`h-full border ${plan.mostPopular ? "border-primary shadow-lg" : ""}`}>
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
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
                    {plan.normalPrice && (
                      <div className="mt-1">
                        <span className="text-sm text-muted-foreground line-through">
                          {plan.normalPrice} value
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mr-3" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    asChild 
                    className="w-full" 
                    variant={plan.mostPopular ? "default" : "outline"}
                  >
                    <Link href="/signup">
                      {plan.cta}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
} 