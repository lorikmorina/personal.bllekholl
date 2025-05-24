'use client'

import Link from 'next/link'
import { CheckCircle, Mail, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import ReactConfetti from 'react-confetti'
import { useState, useEffect } from 'react'

export default function DeepScanSuccessPage() {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Show confetti for a few seconds
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 7000); // Confetti for 7 seconds

    // Get window dimensions for confetti
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6 text-center relative overflow-hidden">
      {showConfetti && windowSize.width > 0 && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.1}
          initialVelocityY={20}
          tweenDuration={5000}
        />
      )}
      <div className="bg-card p-8 sm:p-12 rounded-xl shadow-2xl max-w-lg w-full z-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
        >
          <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400" />
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Thank You!
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Your Deep Scan request has been successfully submitted and payment is confirmed. Our team will begin processing your request shortly.
        </p>

        <div className="bg-secondary/30 dark:bg-secondary/50 p-6 rounded-lg mb-8 text-left">
          <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-primary" />
            Codebase Submission (If Applicable)
          </h2>
          <p className="text-sm text-muted-foreground">
            If you opted to provide your website's codebase for a more in-depth analysis, please send a <strong>.zip</strong> file containing your code to:
          </p>
          <p className="font-semibold text-primary text-lg my-2 break-all">
            lorik@securevibing.com
          </p>
          <p className="text-xs text-muted-foreground">
            Please include the domain name you submitted in the subject line of your email. This will help us match your codebase to your request quickly.
          </p>
        </div>

        <div className="space-y-3 sm:flex sm:space-y-0 sm:space-x-4 justify-center">
          <Link href="/dashboard">
            <Button 
              variant="outline"
              className="w-full sm:w-auto bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="mailto:lorik@securevibing.com">
            <Button className="w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Email Codebase Now
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          You will receive an email confirmation shortly. If you have any questions, please don't hesitate to contact our support team.
        </p>
      </div>
    </div>
  );
} 