import { Metadata } from 'next'
import BlogHero from '../components/blog/BlogHero'
import BlogCard from '../components/blog/BlogCard'
import NewsletterSubscribe from '../components/NewsletterSubscribe'
import { getLatestBlogPosts, getAllCategories, getAllTags } from '../data/blog-posts'

export const metadata: Metadata = {
  title: 'Security Blog - Expert Cybersecurity Insights & Tips | SecureVibing',
  description: 'Stay ahead of cybersecurity threats with expert insights, practical guides, and industry best practices. Learn website security, compliance, and protection strategies.',
  keywords: 'cybersecurity blog, website security, security tips, vulnerability protection, GDPR compliance, SSL certificates, security best practices',
  openGraph: {
    title: 'Security Blog - Expert Cybersecurity Insights & Tips',
    description: 'Stay ahead of cybersecurity threats with expert insights, practical guides, and industry best practices from SecureVibing.',
    type: 'website',
    url: '/blog',
    images: [
      {
        url: '/blog/blog-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'SecureVibing Security Blog - Cybersecurity Insights',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security Blog - Expert Cybersecurity Insights & Tips',
    description: 'Stay ahead of cybersecurity threats with expert insights and practical guides.',
    images: ['/blog/blog-hero.jpg'],
  },
}

// JSON-LD Structured Data for Blog
const blogStructuredData = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "SecureVibing Security Blog",
  "description": "Expert cybersecurity insights, practical guides, and industry best practices for website security and compliance.",
  "url": "https://securevibing.com/blog",
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
    "@id": "https://securevibing.com/blog"
  }
}

export default function BlogPage() {
  const allPosts = getLatestBlogPosts()
  const featuredPost = allPosts[0] // Most recent post as featured
  const otherPosts = allPosts.slice(1)
  const categories = getAllCategories()
  const tags = getAllTags()

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogStructuredData)
        }}
      />
      
      <div className="min-h-screen">
        {/* Hero Section with Featured Post */}
        <BlogHero featuredPost={featuredPost} />
        
        {/* Blog Posts Grid */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            {/* Categories Filter */}
            <div className="flex flex-wrap gap-3 justify-center mb-12">
              <span className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium">
                All Posts
              </span>
              {categories.map((category) => (
                <span
                  key={category}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  {category}
                </span>
              ))}
            </div>
            
            <h2 className="text-3xl font-bold text-center mb-12">Latest Security Insights</h2>
            
            {/* Blog Posts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {otherPosts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))}
            </div>
            
            {/* Popular Tags */}
            <div className="bg-secondary/10 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-6">Popular Topics</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {tags.slice(0, 10).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-12 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Secure Your Website Today</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Reading about security is great, but taking action is better. Start with a free security scan of your website.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Free Security Scan
            </a>
          </div>
        </section>
        
        <NewsletterSubscribe />
      </div>
    </>
  )
} 