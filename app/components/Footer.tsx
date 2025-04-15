import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
        <nav className="-mb-6 columns-2 sm:flex sm:justify-center sm:space-x-12" aria-label="Footer">
          {[
            { name: "Pricing", href: "/pricing" },
            { name: "Learn Free", href: "/learn" },
            { name: "Signup", href: "/signup" },
            { name: "Privacy", href: "/privacy" },
            { name: "Terms", href: "/terms" },
          ].map((item) => (
            <div key={item.name} className="pb-6">
              <Link
                href={item.href}
                className="text-sm leading-6 text-muted-foreground hover:text-foreground"
              >
                {item.name}
              </Link>
            </div>
          ))}
        </nav>
        
        <div className="mt-10 flex justify-center">
          <a 
            href="https://x.com/lorikmor" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Follow us on X (Twitter)"
          >
            <svg 
              viewBox="0 0 24 24" 
              aria-hidden="true" 
              className="h-6 w-6 fill-current"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </a>
        </div>
        
        <p className="mt-10 text-center text-sm leading-5 text-muted-foreground">
          SecureVibing. 2025 Copyright PARADOX BLLEKHOLL SH.P.K.
        </p>
      </div>
    </footer>
  )
}

