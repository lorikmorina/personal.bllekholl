"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock, User, ArrowRight } from 'lucide-react'
import { BlogPost } from '@/app/data/blog-posts'

interface BlogHeroProps {
  featuredPost: BlogPost
}

export default function BlogHero({ featuredPost }: BlogHeroProps) {
  return (
    <section className="py-12 md:py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Security Insights & Tips
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Stay ahead of cybersecurity threats with expert insights, practical guides, 
            and industry best practices from the SecureVibing team.
          </p>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-background rounded-2xl overflow-hidden shadow-xl border border-border max-w-6xl mx-auto"
        >
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative h-64 md:h-auto">
              <Image
                src={featuredPost.featuredImage}
                alt={featuredPost.imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                  Featured
                </span>
              </div>
            </div>
            
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                  {featuredPost.category}
                </span>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{featuredPost.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{featuredPost.readTime}</span>
                </div>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
                {featuredPost.title}
              </h2>
              
              <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                {featuredPost.excerpt}
              </p>
              
              <Link 
                href={`/blog/${featuredPost.slug}`}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors w-fit"
              >
                Read Full Article
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  )
} 