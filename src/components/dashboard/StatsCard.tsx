import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

const StatsCard = ({ icon: Icon, label, value, change, positive }: StatsCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card-hover rounded-2xl p-6"
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-3xl font-bold text-foreground">{value}</p>
        {change && (
          <p className={`text-xs font-medium ${positive ? "text-primary" : "text-destructive"}`}>
            {positive ? "↑" : "↓"} {change} from last month
          </p>
        )}
      </div>
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  </motion.div>
);

export default StatsCard;
