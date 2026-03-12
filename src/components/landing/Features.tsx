import { motion } from "framer-motion";
import {
  BarChart3, Shield, Zap, MapPin, Bell, Users, Leaf, Brain
} from "lucide-react";

const features = [
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track donations, impact metrics, and carbon footprint savings in real-time." },
  { icon: Shield, title: "Role-Based Access", description: "Secure dashboards for donors, NGOs, volunteers, and administrators." },
  { icon: Zap, title: "Real-Time Updates", description: "Instant notifications when donations are listed, accepted, or picked up." },
  { icon: MapPin, title: "Location Matching", description: "Smart distance-based matching connects donors with the nearest NGOs." },
  { icon: Bell, title: "Expiry Alerts", description: "AI-powered alerts ensure food is collected before it goes to waste." },
  { icon: Users, title: "Volunteer Network", description: "Efficient volunteer assignment and live pickup status tracking." },
  { icon: Leaf, title: "Carbon Tracking", description: "Measure and showcase your environmental impact with every donation." },
  { icon: Brain, title: "AI Predictions", description: "Demand forecasting helps plan food distribution more effectively." },
];

const Features = () => (
  <section id="features" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-sm font-medium text-primary">FEATURES</span>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-2">
          Everything You Need to Fight Food Waste
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass-card-hover rounded-2xl p-6 group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
