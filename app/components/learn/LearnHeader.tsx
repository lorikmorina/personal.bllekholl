"use client"

import { motion } from "framer-motion"

export default function LearnHeader() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Free Security Learning Hub
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground">
            Level up your web security knowledge with our curated guides, tutorials, and best practices.
          </p>
        </motion.div>
        
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <a href="#beginner" className="px-5 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            Beginner
          </a>
          <a href="#intermediate" className="px-5 py-2 rounded-full bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 transition-colors">
            Intermediate
          </a>
          <a href="#advanced" className="px-5 py-2 rounded-full bg-accent/10 text-accent-foreground hover:bg-accent/20 transition-colors">
            Advanced
          </a>
          <a href="#tools" className="px-5 py-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
            Tools & Resources
          </a>
        </motion.div>
      </div>
    </section>
  )
} 