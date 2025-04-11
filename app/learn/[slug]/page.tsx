import { Shield } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import NewsletterSubscribe from "@/app/components/NewsletterSubscribe"

// This is a mock function that would be replaced with real data fetching in a production app
function getTopicBySlug(slug: string) {
  const topics = {
    "api-key-protection": {
      title: "Protecting API Keys",
      description: "Learn how to secure your API keys and why you should never include them in client-side code.",
      level: "beginner",
      readTime: "5 min read",
      publishDate: "June 15, 2023",
      author: "Security Team",
      content: `
        <h2>Why API Keys Need Protection</h2>
        <p>API keys are essentially passwords that grant access to services and data. When exposed in client-side code, they can be easily extracted by anyone inspecting your website's source code.</p>
        
        <h3>Common API Key Exposure Issues</h3>
        <p>The most common ways developers accidentally expose API keys include:</p>
        <ul>
          <li>Hardcoding keys directly in JavaScript files</li>
          <li>Including keys in environment variables that are bundled with the client code</li>
          <li>Storing keys in public repositories</li>
          <li>Embedding keys in mobile app binaries</li>
        </ul>
        
        <h2>Best Practices for API Key Security</h2>
        
        <h3>1. Never Include Keys in Frontend Code</h3>
        <p>API keys that need to access external services should never be included in code that gets sent to the browser. Instead, make the API calls from your server.</p>
        
        <pre><code>// DON'T DO THIS
const apiKey = "sk_live_1234567890abcdef";
fetch(\`https://api.example.com/data?key=\${apiKey}\`);</code></pre>
        
        <h3>2. Use Environment Variables Properly</h3>
        <p>When using environment variables with frameworks like Next.js, remember that variables prefixed with <code>NEXT_PUBLIC_</code> will be included in the client bundle. Only use this prefix for non-sensitive information.</p>
        
        <pre><code>// Server-side only (.env)
API_SECRET_KEY=sk_live_1234567890abcdef

// Can be exposed to client (.env)
NEXT_PUBLIC_API_URL=https://api.example.com</code></pre>
        
        <h3>3. Implement a Backend Proxy</h3>
        <p>Create backend endpoints that make the authenticated API requests for your frontend. This keeps sensitive keys secure on your server.</p>
        
        <pre><code>// Frontend code
fetch('/api/get-data')  // Call your own backend

// Backend code (server-side only)
app.get('/api/get-data', (req, res) => {
  // Use API key safely here
  const apiKey = process.env.API_SECRET_KEY;
  // Make request to third-party service
})</code></pre>
        
        <h3>4. Use Token Expiration and Scope Limitation</h3>
        <p>When possible, use tokens with limited scope and short expiration times to minimize potential damage if they're compromised.</p>
        
        <h2>Monitoring for API Key Exposure</h2>
        <p>Regularly scan your codebase and public repositories for accidentally committed secrets using tools like:</p>
        <ul>
          <li>Git-secrets</li>
          <li>SecureVibing's API key detection</li>
          <li>GitHub secret scanning</li>
        </ul>
        
        <h2>What To Do If You've Exposed Keys</h2>
        <ol>
          <li>Revoke and rotate the compromised keys immediately</li>
          <li>Check access logs for unauthorized use</li>
          <li>Remove the keys from your code history (though assume they've been compromised)</li>
          <li>Implement proper security controls before deploying new keys</li>
        </ol>
      `
    }
  }
  
  return topics[slug as keyof typeof topics]
}

export default function TopicPage({ params }: { params: { slug: string } }) {
  const topic = getTopicBySlug(params.slug)
  
  if (!topic) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Topic Not Found</h1>
        <p className="mb-8">The learning topic you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/learn">Back to Learning Hub</Link>
        </Button>
      </div>
    )
  }
  
  const levelColors = {
    beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    intermediate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }
  
  return (
    <div className="py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/learn" className="text-primary hover:underline inline-flex items-center">
            ← Back to Learning Hub
          </Link>
        </div>
        
        <div className="mb-10">
          <div className="flex items-center mb-4 space-x-2">
            <Badge className={`${levelColors[topic.level as keyof typeof levelColors]}`}>
              {topic.level.charAt(0).toUpperCase() + topic.level.slice(1)}
            </Badge>
            <span className="text-muted-foreground">{topic.readTime}</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            {topic.title}
          </h1>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <span>Published {topic.publishDate}</span>
            <span className="mx-2">•</span>
            <span>By {topic.author}</span>
          </div>
        </div>
        
        <div className="prose prose-lg dark:prose-invert max-w-none mb-16"
          dangerouslySetInnerHTML={{ __html: topic.content }}
        />
        
        <div className="border-t border-border pt-8 mb-16">
          <h3 className="text-xl font-bold mb-4">Continue Learning</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/learn/content-security-policy">
              <div className="p-4 border border-border rounded-lg hover:bg-secondary/5 transition-colors">
                <h4 className="font-medium">Next Article</h4>
                <p className="text-primary">Content Security Policy →</p>
              </div>
            </Link>
            <Link href="/learn">
              <div className="p-4 border border-border rounded-lg hover:bg-secondary/5 transition-colors">
                <h4 className="font-medium">Explore More</h4>
                <p className="text-primary">View all security topics →</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center mb-8">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-center mb-4">Ready to secure your website?</h2>
          <p className="text-xl text-center text-muted-foreground mb-8">
            Use our security scanner to check your site for vulnerabilities.
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/">Scan Your Website Now</Link>
            </Button>
          </div>
        </div>
      </div>
      
      <NewsletterSubscribe />
    </div>
  )
} 