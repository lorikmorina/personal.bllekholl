import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, User, Tag, ArrowLeft, Share2 } from 'lucide-react'
import { getBlogPostBySlug, getLatestBlogPosts, blogPosts } from '@/app/data/blog-posts'
import BlogCard from '@/app/components/blog/BlogCard'
import NewsletterSubscribe from '@/app/components/NewsletterSubscribe'

interface BlogPostPageProps {
  params: { slug: string }
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug)
  
  if (!post) {
    return {
      title: 'Post Not Found | SecureVibing',
    }
  }

  return {
    title: `${post.title} | SecureVibing Blog`,
    description: post.seoDescription,
    keywords: post.tags.join(', '),
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.seoDescription,
      type: 'article',
      publishedTime: post.publishDate,
      authors: [post.author],
      images: [
        {
          url: post.featuredImage,
          width: 1200,
          height: 630,
          alt: post.imageAlt,
        }
      ],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.seoDescription,
      images: [post.featuredImage],
    },
  }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPostBySlug(params.slug)
  
  if (!post) {
    notFound()
  }

  const relatedPosts = getLatestBlogPosts(4).filter(p => 
    p.slug !== post.slug && 
    (p.category === post.category || p.tags.some(tag => post.tags.includes(tag)))
  ).slice(0, 3)

  // JSON-LD Structured Data for Article
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.seoDescription,
    "image": [post.featuredImage],
    "datePublished": post.publishDate,
    "dateModified": post.publishDate,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "SecureVibing",
      "logo": {
        "@type": "ImageObject",
        "url": "https://securevibing.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://securevibing.com/blog/${post.slug}`
    },
    "keywords": post.tags.join(", "),
    "articleSection": post.category,
    "wordCount": post.content.split(' ').length,
    "timeRequired": post.readTime
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData)
        }}
      />
      
      <article className="min-h-screen">
        {/* Back Navigation */}
        <div className="border-b border-border">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <Link 
              href="/blog"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </div>
        </div>

        {/* Article Header */}
        <header className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            {/* Category & Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-md font-medium">
                {post.category}
              </span>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.readTime}</span>
              </div>
              <time dateTime={post.publishDate} className="text-muted-foreground">
                {new Date(post.publishDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {post.excerpt}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-md"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-4 pb-8 border-b border-border">
              <span className="text-sm font-medium">Share:</span>
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                <Share2 className="h-4 w-4" />
                Twitter
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors text-sm">
                <Share2 className="h-4 w-4" />
                LinkedIn
              </button>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="container mx-auto px-4 md:px-6 mb-12">
          <div className="relative h-64 md:h-96 lg:h-[500px] rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <Image
              src={post.featuredImage}
              alt={post.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
              priority
            />
          </div>
        </div>

        {/* Article Content */}
        <div className="container mx-auto px-4 md:px-6 mb-16">
          <div className="max-w-4xl mx-auto">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-3xl prose-h3:text-2xl prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-primary/5 py-12 mb-16">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Secure Your Website?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Put these security insights into action. Start with a comprehensive security scan of your website.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Free Security Scan
            </a>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-16 border-t border-border">
            <div className="container mx-auto px-4 md:px-6">
              <h2 className="text-3xl font-bold text-center mb-12">Related Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {relatedPosts.map((relatedPost, index) => (
                  <BlogCard key={relatedPost.id} post={relatedPost} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      <NewsletterSubscribe />
    </>
  )
} 