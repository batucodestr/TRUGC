import { Hero } from "@/components/Hero/Hero";
import { LogoMarquee } from "@/components/Logos/LogoMarquee";
import { VideoFeed } from "@/features/marketing/video-feed";
import { FeaturedCreators } from "@/features/marketing/featured-creators";
import { DashboardPreview } from "@/features/marketing/dashboard-preview";
import { FeaturedBrands } from "@/features/marketing/featured-brands";
import { Categories } from "@/features/marketing/categories";
import { HowItWorks } from "@/features/marketing/how-it-works";
import { Testimonials } from "@/features/marketing/testimonials";
import { ShareCampaignSection } from "@/features/marketing/share-campaign";
import { Pricing } from "@/features/marketing/pricing";
import { Faq } from "@/features/marketing/faq";
import { FeatureStrip } from "@/features/marketing/feature-strip";
import { CtaBanner } from "@/features/marketing/cta-banner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureStrip />
      <CtaBanner />
      <LogoMarquee />
      <VideoFeed />
      <FeaturedCreators />
      <DashboardPreview />
      <FeaturedBrands />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <ShareCampaignSection />
      <Pricing />
      <Faq />
    </>
  );
}
