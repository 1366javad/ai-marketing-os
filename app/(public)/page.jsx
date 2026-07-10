import ContentSection from "@/components/landing/ContentSection";
import FAQSection from "@/components/landing/FAQSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/layout/Footer";

import PricingSection from "@/components/landing/PricingSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import Navbar from "@/components/layout/Navbar";
import { getUserAndProfile } from "@/app/lib/db/getUserData";
import AINetworkHero from "@/components/HeroNetwork/AINetworkHero";

async function Home() {
  const { user } = await getUserAndProfile();
  const primaryCta = user
    ? { href: "/dashboard", label: "Dashboard" }
    : { href: "/signup", label: "Start for Free" };

  return (
    <header>
      <Navbar />
      <main>
        <AINetworkHero primaryCta={primaryCta} />

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
