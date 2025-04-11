"use client"

import { motion } from "framer-motion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function SecurityEducation() {
  const securityIssues = [
    {
      title: "API Key Exposure",
      content: "API keys should never be included directly in frontend code. They can be used by attackers to access your services and potentially rack up large bills or steal data. Always use environment variables and server-side code to handle API requests."
    },
    {
      title: "Missing Content Security Policy",
      content: "Content Security Policy (CSP) helps prevent XSS attacks by specifying which domains can load content on your website. Without it, attackers might be able to inject malicious scripts into your pages."
    },
    {
      title: "Insecure Headers",
      content: "Security headers like X-Frame-Options and X-Content-Type-Options protect your website from clickjacking and MIME type confusion attacks. Adding these headers is a simple way to improve your site's security posture."
    },
    {
      title: "Missing HTTPS",
      content: "All websites should use HTTPS to encrypt data in transit. Without it, user data can be intercepted by attackers on the same network. Modern browsers also mark non-HTTPS sites as 'Not Secure'."
    },
    {
      title: "JavaScript Vulnerabilities",
      content: "Outdated JavaScript libraries often contain known vulnerabilities. Keep your dependencies updated and regularly scan your codebase for security issues using tools like npm audit."
    }
  ]

  return (
    <section className="py-20 bg-secondary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground">Common Security Issues</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Understanding these security vulnerabilities can help you build safer websites
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {securityIssues.map((issue, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-medium">
                  {issue.title}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {issue.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
} 