import { Metadata } from 'next'
import VideoGuide from '../components/VideoGuide'
import NewsletterSubscribe from '../components/NewsletterSubscribe'

export const metadata: Metadata = {
  title: 'Supacheck Quick Start Guide - Video Tutorial | SecureVibing',
  description: 'Learn how to use Supacheck with our comprehensive video guide. Watch our step-by-step tutorial to get started with website security scanning.',
  keywords: 'supacheck, video tutorial, security scanning, website security, cybersecurity guide',
  openGraph: {
    title: 'Supacheck Quick Start Guide - Video Tutorial',
    description: 'Learn how to use Supacheck with our comprehensive video guide. Watch our step-by-step tutorial to get started with website security scanning.',
    type: 'video.other',
    videos: [
      {
        url: '/SupacheckFinal.mp4',
        width: 1920,
        height: 1080,
        type: 'video/mp4',
      }
    ],
    images: [
      {
        url: '/video-thumbnail.jpg', // You'll need to add this thumbnail
        width: 1920,
        height: 1080,
        alt: 'Supacheck Quick Start Guide Video Thumbnail',
      }
    ],
  },
  twitter: {
    card: 'player',
    site: '@securevibing',
    title: 'Supacheck Quick Start Guide - Video Tutorial',
    description: 'Learn how to use Supacheck with our comprehensive video guide.',
    players: [
      {
        playerUrl: '/watch',
        streamUrl: '/SupacheckFinal.mp4',
        width: 1920,
        height: 1080,
      }
    ],
  },
}

// JSON-LD Structured Data for Video
const videoStructuredData = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Supacheck Quick Start Guide",
  "description": "Learn how to use Supacheck with our comprehensive video guide. This tutorial covers website security scanning, vulnerability detection, and how to improve your website's security posture.",
  "thumbnailUrl": "/video-thumbnail.jpg", // You'll need to add this
  "uploadDate": "2024-01-15T00:00:00Z", // Update with actual date
  "duration": "PT5M30S", // Update with actual duration (5 minutes 30 seconds format)
  "contentUrl": "/SupacheckFinal.mp4",
  "embedUrl": "/watch",
  "publisher": {
    "@type": "Organization",
    "name": "SecureVibing",
    "logo": {
      "@type": "ImageObject",
      "url": "/logo.png" // Update with your actual logo path
    }
  },
  "author": {
    "@type": "Organization",
    "name": "SecureVibing"
  },
  "genre": ["Technology", "Cybersecurity", "Tutorial"],
  "keywords": "supacheck, security scanning, website security, cybersecurity, tutorial, guide",
  "videoQuality": "HD",
  "regionsAllowed": ["US", "CA", "GB", "AU", "EU"],
  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": "https://schema.org/WatchAction",
    "userInteractionCount": 0 // You can update this dynamically
  }
}

export default function WatchPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoStructuredData)
        }}
      />
      
      <div className="min-h-screen">
        {/* Video content */}
        <VideoGuide />
        
        {/* Additional content */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2>About This Video</h2>
              <p>
                This comprehensive video guide walks you through the Supacheck security scanning process. 
                You'll learn how to identify vulnerabilities, understand security reports, and implement 
                fixes to improve your website's security posture.
              </p>
              
              <h3>What You'll Learn</h3>
              <ul>
                <li>How to perform a comprehensive security scan</li>
                <li>Understanding vulnerability reports</li>
                <li>Implementing security fixes</li>
                <li>Best practices for website security</li>
                <li>Ongoing security monitoring</li>
              </ul>
              
              <h3>Video Details</h3>
              <div className="not-prose">
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <p><strong>Duration:</strong> 5 minutes 30 seconds</p>
                  <p><strong>Quality:</strong> HD (1080p)</p>
                  <p><strong>Topics Covered:</strong> Security scanning, vulnerability detection, report analysis</p>
                  <p><strong>Skill Level:</strong> Beginner to Intermediate</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <NewsletterSubscribe />
      </div>
    </>
  )
} 