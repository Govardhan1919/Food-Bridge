import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTA = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="gradient-bg rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsla(0,0%,100%,0.1),transparent)]" />
        <div className="relative z-10 space-y-6">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">
            Ready to Reduce Food Waste?
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Join thousands of donors, NGOs, and volunteers making a difference in their communities.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" variant="secondary" className="text-base px-8 group" asChild>
              <Link to="/signup/ngo">
                Join as NGO
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTA;
