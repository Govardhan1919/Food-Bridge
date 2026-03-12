import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Impact from "@/components/landing/Impact";
import CTA from "@/components/landing/CTA";

const Landing = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <Impact />
      <CTA />
    </main>
    <Footer />
  </div>
);

export default Landing;
