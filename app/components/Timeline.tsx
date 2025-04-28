"use client"

import { useState, useRef } from "react"
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion"

const timelineEvents = [
  {
    year: "Step 1",
    title: "Load your website content and data",
    description: "We begin by crawling your website to gather all accessible pages and assets.",
    details:
      "Our advanced web crawlers navigate through your entire website, capturing HTML, JavaScript, CSS, and API endpoints. This comprehensive data collection phase builds a complete map of your web application's structure and content, allowing us to conduct thorough security analysis in subsequent steps.",
  },
  {
    year: "Step 2",
    title: "Scan for major API leaks",
    description: "We analyze your codebase to identify exposed API keys, tokens, and credentials.",
    details:
      "Using pattern recognition and contextual analysis, our scanner detects API keys, access tokens, and credentials that may be inadvertently exposed in your frontend code. This critical step identifies high-risk security vulnerabilities that could allow attackers to access your third-party services and sensitive data.",
  },
  {
    year: "Step 3",
    title: "Scan for missing security headers",
    description: "We evaluate your HTTP response headers to detect missing security configurations.",
    details:
      "Our system checks for essential security headers including Content-Security-Policy, X-XSS-Protection, X-Frame-Options, and more. Proper implementation of these headers is crucial for protecting against common web vulnerabilities such as cross-site scripting (XSS), clickjacking, and other injection attacks.",
  },
  {
    year: "Step 4",
    title: "Scan for public databases",
    description: "We search for exposed database instances and unprotected data storage.",
    details:
      "Our scanner identifies any publicly accessible database connections, storage buckets, or data endpoints that lack proper access controls. This step is essential for preventing data breaches, as exposed databases are among the most common sources of large-scale information leaks and security incidents.",
  },
  {
    year: "Step 5",
    title: "Test database configurations",
    description: "We analyze database setups to identify security misconfigurations and vulnerabilities.",
    details:
      "Our system checks your database configurations for common security issues such as default credentials, excessive permissions, unencrypted connections, and outdated database versions with known vulnerabilities. This detailed analysis helps prevent unauthorized access to your most valuable asset—your data.",
  },
  {
    year: "Step 6",
    title: "Calculate an overall score",
    description: "We compile findings into a comprehensive security score with actionable insights.",
    details:
      "Using a weighted scoring algorithm, we evaluate the severity and impact of discovered vulnerabilities to generate your overall security rating. The final report includes prioritized recommendations for remediation, clear explanations of risks, and specific code examples to help your development team quickly address identified issues.",
  },
]

const FlowerIcon = ({ progress }: { progress: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6"
    style={{ transform: `scale(${progress})` }}
  >
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 8C12 8 14 10 14 12C14 14 12 16 12 16C12 16 10 14 10 12C10 10 12 8 12 8Z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
)

export default function Timeline() {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <section ref={containerRef} className="py-20 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Our Scanning Process</h2>
          <p className="mt-4 text-lg text-muted-foreground">How our dynamic scanning works and why it matters.</p>
        </motion.div>

        <div className="relative">
          {/* Vertical line */}
          <motion.div
            className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-primary/20"
            style={{ scaleY: scaleX }}
          />

          {/* Flower icon */}
          <motion.div
            className="sticky top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-primary"
            style={{ y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
          >
            <FlowerIcon progress={useTransform(scrollYProgress, [0, 1], [0.5, 1]) as any} />
          </motion.div>

          {timelineEvents.map((event, index) => (
            <TimelineEvent
              key={event.year}
              event={event}
              index={index}
              isExpanded={expandedEvent === index}
              onToggle={() => setExpandedEvent(expandedEvent === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function TimelineEvent({
  event,
  index,
  isExpanded,
  onToggle,
}: {
  event: (typeof timelineEvents)[0]
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      className={`mb-8 flex justify-between items-center w-full ${index % 2 === 0 ? "flex-row-reverse" : ""}`}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      <div className="w-5/12" />
      <div className="z-20">
        <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
          <div className="w-3 h-3 bg-background rounded-full" />
        </div>
      </div>
      <motion.div
        className="w-5/12 cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
      >
        <div className="p-4 bg-background rounded-lg shadow-md border border-primary/10">
          <span className="font-bold text-primary">{event.year}</span>
          <h3 className="text-lg font-semibold mb-1">{event.title}</h3>
          <p className="text-muted-foreground">{event.description}</p>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-sm text-muted-foreground">{event.details}</p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

