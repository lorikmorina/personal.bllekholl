"use client"

import { motion } from "framer-motion"
import { Shield, Lock, Key, Bug, Globe, Code, Server, Database, BellRing, Cpu } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const topics = [
  {
    id: "api-key-protection",
    title: "Protecting API Keys",
    description: "Learn how to secure your API keys and why you should never include them in client-side code.",
    icon: <Key className="w-10 h-10 text-amber-500" />,
    level: "beginner",
    readTime: "5 min read",
    slug: "api-key-protection"
  },
  {
    id: "content-security-policy",
    title: "Content Security Policy",
    description: "Understanding CSP and how it can protect your site from cross-site scripting (XSS) attacks.",
    icon: <Shield className="w-10 h-10 text-blue-500" />,
    level: "intermediate",
    readTime: "8 min read",
    slug: "content-security-policy"
  },
  {
    id: "https-everywhere",
    title: "HTTPS Everywhere",
    description: "Why every website needs HTTPS and how to properly implement it for your projects.",
    icon: <Lock className="w-10 h-10 text-green-500" />,
    level: "beginner",
    readTime: "6 min read",
    slug: "https-everywhere"
  },
  {
    id: "security-headers",
    title: "Essential Security Headers",
    description: "A comprehensive guide to all security headers you should implement on your website.",
    icon: <Globe className="w-10 h-10 text-indigo-500" />,
    level: "intermediate",
    readTime: "10 min read",
    slug: "security-headers"
  },
  {
    id: "dependency-scanning",
    title: "Dependency Scanning",
    description: "How to scan and fix vulnerable dependencies in your JavaScript projects.",
    icon: <Bug className="w-10 h-10 text-red-500" />,
    level: "intermediate",
    readTime: "7 min read",
    slug: "dependency-scanning"
  },
  {
    id: "jwt-security",
    title: "JWT Security Best Practices",
    description: "Common pitfalls and best practices when working with JSON Web Tokens.",
    icon: <Code className="w-10 h-10 text-purple-500" />,
    level: "advanced",
    readTime: "12 min read",
    slug: "jwt-security"
  },
  {
    id: "cors-explained",
    title: "CORS Demystified",
    description: "Understanding Cross-Origin Resource Sharing and how to configure it properly.",
    icon: <Server className="w-10 h-10 text-orange-500" />,
    level: "intermediate",
    readTime: "9 min read",
    slug: "cors-explained"
  },
  {
    id: "sql-injection",
    title: "Preventing SQL Injection",
    description: "Techniques to protect your database from SQL injection attacks.",
    icon: <Database className="w-10 h-10 text-teal-500" />,
    level: "beginner",
    readTime: "8 min read",
    slug: "sql-injection"
  },
  {
    id: "xss-prevention",
    title: "XSS Prevention",
    description: "Learn how to prevent cross-site scripting attacks in modern web applications.",
    icon: <BellRing className="w-10 h-10 text-pink-500" />,
    level: "intermediate",
    readTime: "11 min read",
    slug: "xss-prevention"
  },
  {
    id: "supply-chain-attacks",
    title: "Supply Chain Attacks",
    description: "Understanding and mitigating the risks of software supply chain attacks.",
    icon: <Cpu className="w-10 h-10 text-slate-500" />,
    level: "advanced",
    readTime: "15 min read",
    slug: "supply-chain-attacks"
  }
]

const levelColors = {
  beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  intermediate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
}

export default function LearnTopicGrid() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  // Group topics by level
  const beginnerTopics = topics.filter(topic => topic.level === "beginner")
  const intermediateTopics = topics.filter(topic => topic.level === "intermediate")
  const advancedTopics = topics.filter(topic => topic.level === "advanced")

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-7xl mx-auto">
        <section id="beginner" className="py-10">
          <h2 className="text-3xl font-bold mb-8">Beginner Guides</h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {beginnerTopics.map((topic) => (
              <motion.div key={topic.id} variants={itemVariants}>
                <TopicCard topic={topic} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section id="intermediate" className="py-10">
          <h2 className="text-3xl font-bold mb-8">Intermediate Concepts</h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {intermediateTopics.map((topic) => (
              <motion.div key={topic.id} variants={itemVariants}>
                <TopicCard topic={topic} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section id="advanced" className="py-10">
          <h2 className="text-3xl font-bold mb-8">Advanced Security</h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {advancedTopics.map((topic) => (
              <motion.div key={topic.id} variants={itemVariants}>
                <TopicCard topic={topic} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <motion.section 
          id="tools" 
          className="py-10 mt-10 p-8 rounded-xl bg-secondary/10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl font-bold mb-6">Tools & Resources</h2>
          <p className="text-lg mb-8">
            Boost your security workflow with these essential tools and resources.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResourceCard 
              title="OWASP Top 10"
              description="Learn about the top 10 web application security risks according to OWASP."
              link="https://owasp.org/www-project-top-ten/"
            />
            <ResourceCard 
              title="Mozilla Observatory"
              description="Free scan for your website to test for security vulnerabilities and implementation issues."
              link="https://observatory.mozilla.org/"
            />
            <ResourceCard 
              title="Security Headers"
              description="Quickly test your website's security headers for best practices."
              link="https://securityheaders.com/"
            />
            <ResourceCard 
              title="SSL Labs"
              description="Test your SSL/TLS implementation for security and configuration issues."
              link="https://www.ssllabs.com/ssltest/"
            />
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function TopicCard({ topic }: { topic: any }) {
  return (
    <Link href={`/learn/${topic.slug}`}>
      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-border">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>{topic.icon}</div>
            <Badge className={`${levelColors[topic.level as keyof typeof levelColors]}`}>
              {topic.level.charAt(0).toUpperCase() + topic.level.slice(1)}
            </Badge>
          </div>
          <CardTitle className="mt-4">{topic.title}</CardTitle>
          <CardDescription className="text-muted-foreground">{topic.readTime}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{topic.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ResourceCard({ title, description, link }: { title: string; description: string; link: string }) {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </a>
  )
} 