import { Clock, MapPin, Package } from "lucide-react";

interface DonationCardProps {
  title: string;
  type?: string;
  quantity?: string;
  meal_plates?: number;
  expiry: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  status: "pending_verification" | "available" | "accepted" | "picked_up" | "delivered";
}

const statusColors: Record<string, string> = {
  pending_verification: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  available: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  picked_up: "bg-warning/10 text-warning border-warning/20",
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  pending_verification: "Pending Verification",
  available: "Available",
  accepted: "Accepted",
  picked_up: "In Transit",
  delivered: "Delivered",
};

const DonationCard = ({ title, type, quantity, meal_plates, expiry, location, latitude, longitude, status }: DonationCardProps) => {
  const displayQuantity = quantity ?? (meal_plates !== undefined ? `${meal_plates} plates` : "");
  const displayLocation = location ?? (latitude ? `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude ?? "0").toFixed(4)}` : "—");

  return (
    <div className="glass-card-hover rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {type ? `${type} · ` : ""}{displayQuantity}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[status] ?? ''}`}>
          {statusLabels[status] ?? status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expires: {expiry}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {displayLocation}
        </span>
      </div>
    </div>
  );
};

export default DonationCard;
