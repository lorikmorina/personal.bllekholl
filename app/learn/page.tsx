import LearnHeader from "@/app/components/learn/LearnHeader"
import LearnTopicGrid from "@/app/components/learn/LearnTopicGrid"
import NewsletterSubscribe from "@/app/components/NewsletterSubscribe"

export default function LearnPage() {
  return (
    <div className="py-10">
      <LearnHeader />
      <LearnTopicGrid />
      <NewsletterSubscribe />
    </div>
  )
} 