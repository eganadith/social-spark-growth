import HeroSection from "@/components/home/HeroSection";
import PackagesSection from "@/components/home/PackagesSection";
import HowItWorks from "@/components/home/HowItWorks";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Testimonials from "@/components/home/Testimonials";
import FAQSection from "@/components/home/FAQSection";

export default function Index() {
  return (
    <main>
      <HeroSection />
      <PackagesSection />
      <HowItWorks />
      <WhyChooseUs />
      <Testimonials />
      <FAQSection />
    </main>
  );
}
