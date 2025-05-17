import ScanHeader from "@/app/components/scan/ScanHeader"
import FreeScanner from "@/app/components/scan/FreeScanner"
import NewsletterSubscribe from "@/app/components/NewsletterSubscribe"

export default function ScanFreePage() {
  return (
    <div className="py-10">
      <ScanHeader />
      <FreeScanner />
      <NewsletterSubscribe />
    </div>
  )
} 