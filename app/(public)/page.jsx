import ContentSection from "@/components/landing/ContentSection";
import FAQSection from "@/components/landing/FAQSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/layout/Footer";

import PricingSection from "@/components/landing/PricingSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import Navbar from "@/components/layout/Navbar";
import { getUserAndProfile } from "@/app/lib/db/getUserData";

import Hero from "@/components/home/Hero";
import Problem from "@/components/home/Problem";
import Solution from "@/components/home/Solution";
import LoopWorkflow from "@/components/home/LoopWorkflow";
import IntelligenceCompounding from "@/components/home/IntelligenceCompounding";
import Workspace from "@/components/home/Workspace";
import CTA from "@/components/home/CTA";

async function Home() {
  const { user } = await getUserAndProfile();
  const primaryCta = user
    ? { href: "/dashboard", label: "Dashboard" }
    : { href: "/signup", label: "Start for Free" };

  return (
    <header>
      <Navbar />
      <main>
        {/* <HeroSection primaryCta={primaryCta} />
        <FeaturesSection />
        <ContentSection primaryCta={primaryCta} />
        <WorkflowSection />
        <PricingSection />
        <FAQSection primaryCta={primaryCta} /> */}
        <Hero />
        <Problem />
        <Solution />
        <LoopWorkflow />
        <IntelligenceCompounding />

        <Workspace />

        <CTA />
        <Footer />
      </main>
    </header>
  );
}
export default Home;
