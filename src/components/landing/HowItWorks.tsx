import { motion } from "framer-motion";
import { Upload, Search, Truck, Heart } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "List Surplus Food",
    description: "Donors list available food with details like type, quantity, and expiry time.",
  },
  {
    icon: Search,
    title: "NGOs Browse & Accept",
    description: "NGOs find nearby donations, filter by food type, and accept pickups.",
  },
  {
    icon: Truck,
    title: "Volunteer Picks Up",
    description: "Assigned volunteers collect food and deliver it to distribution points.",
  },
  {
    icon: Heart,
    title: "Communities Fed",
    description: "Surplus food reaches those in need—zero waste, maximum impact.",
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-24 bg-muted/30">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-sm font-medium text-primary">HOW IT WORKS</span>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-2">
          Simple. Efficient. Impactful.
        </h2>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Four easy steps to turn surplus food into community nourishment.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="glass-card-hover rounded-2xl p-6 text-center relative"
          >
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
              {i + 1}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <step.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
