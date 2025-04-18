"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import React from "react"

export default function TermsOfService() {
  return (
    <div className="container max-w-3xl py-12">
      <Link href="/">
        <Button variant="ghost" className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using SecureVibing, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you do not have permission to access the service.
        </p>
        
        <h2>2. Description of Service</h2>
        <p>
          SecureVibing is a product of PARADOX BLLEKHOLL SH.P.K. (SH.P.K. means L.L.C in Kosovo, where the business is located) that provides automatic web security scanning services that analyze websites for security vulnerabilities, including but not limited to API key leaks and security header configurations.
        </p>
        
        <h2>3. Account Registration</h2>
        <p>
          To use certain features of our service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </p>
        
        <h2>4. Subscription Plans</h2>
        <p>We offer the following subscription plans:</p>
        <ul>
          <li><strong>Free Plan:</strong> Limited scanning capabilities with basic features.</li>
          <li><strong>Yearly Plan ($24/year):</strong> Full access to all features, billed annually.</li>
          <li><strong>Lifetime Plan ($49):</strong> One-time payment for extended access to all features.</li>
        </ul>
        
        <h2>5. Lifetime Access Definition</h2>
        <p>
          The "Lifetime" subscription provides access to SecureVibing for a maximum of seven (7) years from the date of purchase, or until the service is discontinued, whichever comes first. "Lifetime" does not mean an infinite period, but rather the lifetime of the product as determined by SecureVibing.
        </p>
        <p>
          We reserve the right to:
        </p>
        <ul>
          <li>Modify the features available in the Lifetime plan</li>
          <li>Transfer Lifetime users to a comparable plan if the service undergoes significant changes</li>
          <li>Discontinue the service with 90 days' notice to Lifetime subscribers</li>
        </ul>
        <p>
          In the event that SecureVibing ceases operations before the seven-year period has elapsed, we are not obligated to provide refunds for Lifetime subscriptions.
        </p>
        
        <h2>6. Payment Terms</h2>
        <p>
          Payments for subscriptions are processed through Paddle. By subscribing to a paid plan, you authorize us to charge the applicable fees to your designated payment method. All payments are non-refundable except as required by law.
        </p>
        
        <h2>7. Acceptable Use</h2>
        <p>
          You agree to use SecureVibing only for lawful purposes and in accordance with these Terms. You specifically agree not to:
        </p>
        <ul>
          <li>Scan websites you do not own or have explicit permission to scan</li>
          <li>Use our service to conduct attacks on websites</li>
          <li>Attempt to bypass any limitations or restrictions on our service</li>
          <li>Resell or redistribute our service without our explicit permission</li>
          <li>Use automated means to access or use our service except through our provided API</li>
        </ul>
        
        <h2>8. Intellectual Property</h2>
        <p>
          SecureVibing and its content, features, and functionality are owned by us and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our service without our explicit permission.
        </p>
        
        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, SecureVibing shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, regardless of the theory of liability.
        </p>
        <p>
          Our service is provided "as is" and "as available" without any warranty of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
        </p>
        
        <h2>10. Service Modifications</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of our service at any time without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of our service.
        </p>
        
        <h2>11. Termination</h2>
        <p>
          We may terminate or suspend your account and access to our service immediately, without prior notice, for conduct that we determine violates these Terms, is harmful to other users, or is harmful to us or our business interests.
        </p>
        
        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate, without regard to its conflict of law provisions.
        </p>
        
        <h2>13. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. If we make changes, we will post the updated Terms on this page and update the "Last updated" date. Your continued use of our service after any such changes constitutes your acceptance of the new Terms.
        </p>
        
        <h2>14. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at bllekhollsolutions@gmail.com.
        </p>
      </div>
    </div>
  )
} 