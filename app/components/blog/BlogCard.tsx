"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock, User, Tag } from 'lucide-react'
import { BlogPost } from '@/app/data/blog-posts'

interface BlogCardProps {
  post: BlogPost
  index?: number
}

export default function BlogCard({ post, index = 0 }: BlogCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-background border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group"
    >
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={post.featuredImage}
            alt={post.imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
              {post.category}
            </span>
          </div>
        </div>
      </Link>
      
      <div className="p-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{post.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{post.readTime}</span>
          </div>
        </div>
        
        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-xl font-bold mb-3 hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        
        <p className="text-muted-foreground mb-4 line-clamp-3">
          {post.excerpt}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {post.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{post.tags.length - 2} more
              </span>
            )}
          </div>
          
          <Link 
            href={`/blog/${post.slug}`}
            className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
          >
            Read More →
          </Link>
        </div>
      </div>
    </motion.article>
  )
} 