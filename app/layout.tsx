import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "./components/Header"
import Footer from "./components/Footer"
import type React from "react"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Secure Vibing - Website Security Scanner",
  description: "Scan your website for security vulnerabilities, exposed API keys, and missing security headers",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ELGTBBT8QF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ELGTBBT8QF');
          `}
        </Script>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />

        <Script src="https://securevibing.com/api/supacheck/script?userId=509cbd79-2730-46ed-bfcd-af4cb853eb4e" 
        async
        />
        

        
       

        
        
        <meta name="apple-mobile-web-app-title" content="SecureVibing" />
        <meta property="og:title" content="Pass the Security Vibe Check" />
        <meta property="og:description" content="Scan your website for leaked API keys, missing security headers, and more. Launch with confidence." />
        <meta property="og:image" content="https://securevibing.com/banner.png" />
        <meta property="og:url" content="https://securevibing.com" />
        <meta property="og:type" content="website" />
        
        {/* Favicon tags */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/web-app-manifest-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/web-app-manifest-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
        
      </body>
    </html>
  )
}



import './globals.css'