import { Hero } from "@/components/Hero/Hero";
import { LogoMarquee } from "@/components/Logos/LogoMarquee";
import { VideoFeed } from "@/features/marketing/video-feed";
import { FeaturedCreators } from "@/features/marketing/featured-creators";
import { DashboardPreview } from "@/features/marketing/dashboard-preview";
import { FeaturedBrands } from "@/features/marketing/featured-brands";
import { Categories } from "@/features/marketing/categories";
import { HowItWorks } from "@/features/marketing/how-it-works";
import { Testimonials } from "@/features/marketing/testimonials";
import { Pricing } from "@/features/marketing/pricing";
import { Faq } from "@/features/marketing/faq";
import { Cta } from "@/features/marketing/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoMarquee />
      <VideoFeed />
      <FeaturedCreators />
      <DashboardPreview />
      <FeaturedBrands />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <Faq />
      <Cta />
    </>
  );
}
