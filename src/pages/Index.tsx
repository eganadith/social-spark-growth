import HeroSection from "@/components/home/HeroSection";
import TrustStripSection from "@/components/home/TrustStripSection";
import PackagesSection from "@/components/home/PackagesSection";
import HowItWorks from "@/components/home/HowItWorks";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Testimonials from "@/components/home/Testimonials";
import AffiliatePromoSection from "@/components/home/AffiliatePromoSection";
import FAQSection from "@/components/home/FAQSection";

export default function Index() {
  return (
    <main>
      <HeroSection />
      <TrustStripSection />
      <PackagesSection />
      <HowItWorks />
      <WhyChooseUs />
      <Testimonials />
      <AffiliatePromoSection />
      <FAQSection />
    </main>
  );
}
