import Hero from "./components/Hero"
import FeatureCarousel from "./components/FeatureCarousel"
import SecurityEducation from "./components/SecurityEducation"
import PortfolioGrid from "./components/PortfolioGrid"
//import Timeline from "./components/Timeline"
import Marquee from "./components/Marquee"
import ContactForm from "./components/ContactForm"
import NewsletterSubscribe from "./components/NewsletterSubscribe"

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureCarousel />
      <SecurityEducation />
      {/* <PortfolioGrid /> */}
      {/* <Timeline /> */}
      <Marquee />
      {/* <ContactForm /> */}
      <NewsletterSubscribe />
    </>
  )
}

