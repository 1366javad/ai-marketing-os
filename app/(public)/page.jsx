import ContentSection from "@/components/landing/ContentSection";
import FAQSection from "@/components/landing/FAQSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";

import PricingSection from "@/components/landing/PricingSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import Navbar from "@/components/layout/Navbar";
import { getUserAndProfile } from "@/app/lib/db/getUserData";

async function Home() {
  const { user } = await getUserAndProfile();
  const primaryCta = user
    ? { href: "/dashboard", label: "Dashboard" }
    : { href: "/signup", label: "Start for Free" };

  return (
    <header>
      <Navbar />
      <main>
        <HeroSection primaryCta={primaryCta} />
        {/* featur */}
        <FeaturesSection />
        {/* content */}
        <ContentSection primaryCta={primaryCta} />
        {/* workflow */}
        <WorkflowSection />
        {/* price */}
        <PricingSection />
        <FAQSection primaryCta={primaryCta} />
        <Footer />
      </main>
    </header>
  );
}
export default Home;
