import Hero from "./components/Hero"
import FeatureCarousel from "./components/FeatureCarousel"
import VideoGuide from "./components/VideoGuide"
import SecurityEducation from "./components/SecurityEducation"
//import Timeline from "./components/Timeline"
import Marquee from "./components/Marquee"
import NewsletterSubscribe from "./components/NewsletterSubscribe"
import Timeline from "./components/Timeline"

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureCarousel />
      <VideoGuide />
      <SecurityEducation />
      {/* <PortfolioGrid /> */}
      {/* <Timeline /> */}
      <Marquee />
      {/* <ContactForm /> */}
      <Timeline/>
      <NewsletterSubscribe />
    </>
  )
}

