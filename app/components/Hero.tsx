"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { 
  Shield, Globe, Zap, Lock, Lightbulb, User,
  AlertCircle, Gauge, Heart, Repeat, MessageSquare, Share, VerifiedIcon
} from "lucide-react"

// Twitter Post Marquee Component
const TwitterPostMarquee = () => {
  // Template posts - you can replace these with real content later
  const posts = [
    {
      id: 1,
      author: {
        name: "Abbas Agha",
        handle: "@uAghazadae",
        avatar: "/Xprofiles/uAghazadae.jpg",
        verified: true
      },
      content: "yesterday @lorikmor said me that i have a bug on my website.\n\nI want to say thanks to @lorikmor for catching my supabase bug and helping me fix it.\n\nAlso his app @SecureVibing is awesome to find website vulnerabilities. go check it out vibe coders",
      date: "2h"
    },
    {
      id: 2,
      author: {
        name: "Chatbit",
        handle: "@ChatbitAI",
        avatar: "/Xprofiles/ChatbitAI.jpg",
        verified: false
      },
      content: "Thanks, @lorikmor! Now I can sleep at night knowing my website isn't secretly a bug hotel. 🐞🏨",
      date: "1d"
    },
    {
      id: 3,
      author: {
        name: "laod",
        handle: "@laoddev",
        avatar: "/Xprofiles/laoddev.jpg",
        verified: false
      },
      content: "thanks to @SecureVibing I was able to make my app @waitlaunch much more secure.",
      date: "1d"
    }
  ];

  // Function to highlight mentions in tweet text
  const formatTweetContent = (content: string) => {
    // Replace mentions with highlighted spans
    const formattedContent = content
      .replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
      .replace(/\n/g, '<br />'); // Replace line breaks with HTML breaks
    return { __html: formattedContent };
  };

  return (
    <div className="pt-12 pb-8 border-t border-border">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">What people are saying</h2>
        <p className="text-muted-foreground">Join other vibe coders securing their websites</p>
      </div>
      
      <div className="relative overflow-hidden">
        {/* Left gradient overlay */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-24 z-10 bg-gradient-to-r from-background to-transparent"></div>
        
        {/* Right gradient overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 z-10 bg-gradient-to-l from-background to-transparent"></div>
        
        <div className="flex animate-marquee py-4">
          {posts.concat(posts).map((post, index) => (
            <div 
              key={`${post.id}-${index}`} 
              className="min-w-[300px] sm:min-w-[320px] max-w-[300px] sm:max-w-[320px] bg-card p-4 rounded-xl border border-border shadow-sm mx-3 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted mr-3 flex-shrink-0">
                  {post.author.avatar ? (
                    <img 
                      src={post.author.avatar} 
                      alt={`${post.author.name}'s avatar`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Safely handle image error
                        try {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                          // Create a fallback element instead of modifying innerHTML
                          const fallbackDiv = document.createElement('div');
                          fallbackDiv.className = "bg-primary/10 w-full h-full flex items-center justify-center";
                          fallbackDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-primary"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                          
                          if (target.parentElement) {
                            target.parentElement.appendChild(fallbackDiv);
                          }
                        } catch (err) {
                          console.error('Error handling image fallback:', err);
                        }
                      }}
                    />
                  ) : (
                    <div className="bg-primary/10 w-full h-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="font-semibold truncate">{post.author.name}</span>
                    {post.author.verified && (
                      <svg className="w-4 h-4 ml-1 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm truncate">{post.author.handle}</div>
                </div>
                <div className="text-muted-foreground text-xs ml-1 flex-shrink-0">{post.date}</div>
              </div>
              
              <div className="mb-0 flex-grow max-h-[150px] overflow-y-auto">
                <p 
                  className="text-sm break-words leading-relaxed" 
                  dangerouslySetInnerHTML={formatTweetContent(post.content)}
                ></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Hero() {
  const router = useRouter()

  return (
    <div className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left Column - Hero Text */}
          <motion.div
            className="flex flex-col text-center sm:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mx-auto sm:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-gradient">Save Money, Secure Your Website</span>
            </motion.h1>
            <motion.p
              className="mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground mx-auto sm:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Do you use Cursor, Windsurf, Claude, ChatGPT, Grok to code? Then you need to scan your website for security issues to see if your website has vulnerabilities that can lose you big money or loyal customers. Find leaked API keys, database misconfigurations,
              missing security headers, and other common vulnerabilities.
            </motion.p>
            
            {/* Simple CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-8 w-full flex justify-center sm:justify-start"
            >
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white font-medium"
                onClick={() => router.push('/signup')}
              >
                <Shield className="mr-2 h-5 w-5" />
                Start Now
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Right Column - Security Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="w-full max-w-lg mx-auto">
              <img 
                src="/design/hero-secureviber.png"
                alt="SecureVibing Scanner"
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </motion.div>
        </div>
        
        {/* Twitter Posts Marquee */}
        <TwitterPostMarquee />
      </div>
    </div>
  )
}

