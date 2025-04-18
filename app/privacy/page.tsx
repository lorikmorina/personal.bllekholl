"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import React from "react"

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-3xl py-12">
      <Link href="/">
        <Button variant="ghost" className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>
          Welcome to SecureVibing, a product of PARADOX BLLEKHOLL SH.P.K. We respect your privacy and are committed to protecting your personal data. 
          This privacy policy explains how we collect, use, and safeguard your information when you use our service.
        </p>
        
        <h2>2. Data We Collect</h2>
        <p>We collect and process the following types of information:</p>
        <ul>
          <li><strong>Account Information:</strong> Email address and authentication details when you create an account.</li>
          <li><strong>Subscription Information:</strong> Payment details processed by our payment provider Paddle.</li>
          <li><strong>Scan Data:</strong> URLs you submit for scanning, scan results, and security reports.</li>
          <li><strong>Usage Data:</strong> Information about how you interact with our service.</li>
          <li><strong>Technical Data:</strong> IP address, browser type, device information.</li>
        </ul>
        
        <h2>3. How We Use Your Data</h2>
        <p>We use your information for the following purposes:</p>
        <ul>
          <li>To provide and maintain our service</li>
          <li>To process your subscription and payment</li>
          <li>To send you security reports and notifications</li>
          <li>To improve and optimize our service</li>
          <li>To detect and prevent fraudulent or unauthorized activity</li>
          <li>To comply with legal obligations</li>
        </ul>
        
        <h2>4. Data Storage and Retention</h2>
        <p>
          We store your data securely using industry-standard practices. Scan data is retained for as long as your account is active. 
          If you delete your account, your personal information will be removed from our systems within 30 days.
        </p>
        
        <h2>5. Third-Party Services</h2>
        <p>
          We use the following third-party services:
        </p>
        <ul>
          <li><strong>Supabase:</strong> For database and authentication services</li>
          <li><strong>Paddle:</strong> For payment processing</li>
          <li><strong>Netlify:</strong> For website hosting</li>
        </ul>
        <p>
          These services have their own privacy policies that govern how they process your data.
        </p>
        
        <h2>6. Security Scanning</h2>
        <p>
          When you use our security scanning features:
        </p>
        <ul>
          <li>We only scan URLs that you explicitly request us to scan</li>
          <li>We do not exploit vulnerabilities in your website</li>
          <li>We store scan results in our secure database to provide history and trend analysis</li>
          <li>We do not share your scan results with third parties</li>
        </ul>
        
        <h2>7. Your Rights</h2>
        <p>
          Depending on your location, you may have rights regarding your personal data, including:
        </p>
        <ul>
          <li>The right to access your data</li>
          <li>The right to correct inaccurate data</li>
          <li>The right to delete your data</li>
          <li>The right to object to our processing of your data</li>
          <li>The right to data portability</li>
        </ul>
        <p>
          To exercise these rights, please contact us at bllekhollsolutions@gmail.com.
        </p>
        
        <h2>8. Cookies and Tracking</h2>
        <p>
          We use cookies and similar tracking technologies to improve your experience with our service.
          You can control cookies through your browser settings.
        </p>
        
        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date.
        </p>
        
        <h2>10. Contact Us</h2>
        <p>
          If you have any questions about this privacy policy, please contact us at bllekhollsolutions@gmail.com.
        </p>
      </div>
    </div>
  )
} 