import { motion } from "framer-motion";

const stats = [
  { value: "2.5M", label: "Kg Food Saved", suffix: "+" },
  { value: "150K", label: "Meals Distributed", suffix: "+" },
  { value: "1,200", label: "Active Volunteers", suffix: "" },
  { value: "340", label: "Tons CO₂ Prevented", suffix: "+" },
];

const Impact = () => (
  <section id="impact" className="py-24 relative overflow-hidden">
    <div className="absolute inset-0 gradient-bg opacity-[0.04]" />
    <div className="container mx-auto px-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-sm font-medium text-primary">OUR IMPACT</span>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-2">
          Making a Real Difference
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-8 text-center animate-pulse-glow"
          >
            <div className="font-display text-4xl md:text-5xl font-bold gradient-text">
              {stat.value}{stat.suffix}
            </div>
            <div className="text-muted-foreground mt-2 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Impact;
