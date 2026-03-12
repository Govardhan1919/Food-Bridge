import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-food.jpg";

const Hero = () => (
  <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
    {/* Background decoration */}
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
    </div>

    <div className="container mx-auto px-4 py-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
          >
            <Sparkles className="h-4 w-4" />
            Reducing food waste, one meal at a time
          </motion.div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
            Bridge the Gap Between{" "}
            <span className="gradient-text">Surplus & Need</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Connect restaurants, event organizers, and households with NGOs and volunteers
            to redistribute surplus food efficiently and create a zero-waste future.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="text-base px-8 group" asChild>
              <Link to="/signup/donor">
                Start Donating
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link to="/#how-it-works">Learn More</Link>
            </Button>
          </div>

          <div className="flex items-center gap-8 pt-4">
            {[
              { value: "10K+", label: "Meals Saved" },
              { value: "500+", label: "Active Donors" },
              { value: "50+", label: "NGO Partners" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="relative rounded-3xl overflow-hidden shadow-glow animate-float">
            <img
              src={heroImage}
              alt="Fresh food being shared between communities"
              className="w-full h-auto rounded-3xl"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent rounded-3xl" />
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default Hero;
