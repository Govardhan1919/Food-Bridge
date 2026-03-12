import { useState } from "react";
import { Truck, CheckCircle, Clock, MapPin, WifiOff } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import OnlineToggle from "@/components/dashboard/OnlineToggle";
import OpportunityAlert from "@/components/dashboard/OpportunityAlert";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/lib/socket";

interface Pickup {
  id: number;
  from_location: string;
  to_location: string;
  item: string;
  meal_plates: number;
  pickup_lat?: string;
  pickup_lon?: string;
  scheduled_time: string | null;
  status: "pending" | "in_progress" | "completed";
  extra_donation_ids?: number[];
}

interface NearbyDonation {
  id: number;
  title: string;
  meal_plates: number;
  latitude: string;
  longitude: string;
  expiry: string;
}

interface VolunteerStats {
  activePickups: number;
  completed: number;
  totalPickups: number;
}

const statusLabel = (s: string) =>
  s === "completed" ? "Completed" : s === "in_progress" ? "In Progress" : "Pending";

const statusBadge = (s: string) =>
  s === "completed"
    ? "bg-primary/10 text-primary border-primary/20"
    : s === "in_progress"
      ? "bg-warning/10 text-warning border-warning/20"
      : "bg-muted text-muted-foreground border-border";

const VolunteerDashboard = () => {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(user?.is_online ?? false);
  const [enRouteOpportunity, setEnRouteOpportunity] = useState<{ pickupId: number; donations: NearbyDonation[] } | null>(null);
  // Track active pickup id for en-route alerts
  const [activePickupId, setActivePickupId] = useState<number | null>(null);

  const { data: pickups = [] } = useQuery<Pickup[]>({
    queryKey: ["pickups"],
    queryFn: () => api.get<Pickup[]>("/pickups"),
  });

  const { data: stats } = useQuery<VolunteerStats>({
    queryKey: ["stats"],
    queryFn: () => api.get<VolunteerStats>("/stats"),
  });

  // Real-time socket listeners
  useSocket(user?.id, {
    pickup_assigned: (data: unknown) => {
      const d = data as { pickup: Pickup; donation: { title: string; meal_plates: number } };
      toast({
        title: "📦 New Pickup Assigned!",
        description: `"${d.donation.title}" — ${d.donation.meal_plates} plates`,
      });
      queryClient.invalidateQueries({ queryKey: ["pickups"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    en_route_opportunity: (data: unknown) => {
      const d = data as { donations: NearbyDonation[]; remainingCapacity: number };
      const current = pickups.find((p) => p.status === "in_progress");
      if (current) {
        setEnRouteOpportunity({ pickupId: current.id, donations: d.donations });
        toast({ title: "🚗 Extra Pickup Nearby!", description: `${d.donations.length} donation(s) on your route with ${d.remainingCapacity} plates remaining capacity.` });
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/pickups/${id}/status`, { status }),
    onSuccess: (_, { id, status }) => {
      toast({ title: "Pickup updated!", description: "Status has been saved." });
      queryClient.invalidateQueries({ queryKey: ["pickups"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (status === "in_progress") setActivePickupId(id);
      if (status === "completed") setActivePickupId(null);
    },
    onError: (err: Error) =>
      toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Online/Offline Toggle */}
      {user && (
        <OnlineToggle riderId={user.id} isOnline={isOnline} onToggle={setIsOnline} />
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Rider Dashboard</h1>
        <p className="text-muted-foreground text-sm">Your assigned pickups and deliveries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={Truck} label="Active Pickups" value={String(stats?.activePickups ?? 0)} />
        <StatsCard icon={CheckCircle} label="Completed" value={String(stats?.completed ?? 0)} />
        <StatsCard icon={Clock} label="Total Pickups" value={String(stats?.totalPickups ?? 0)} />
      </div>

      {!isOnline && (
        <div className="flex items-center gap-3 rounded-2xl border border-muted bg-muted/40 px-5 py-3">
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">You are offline. Switch online to receive pickup notifications.</p>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Assigned Pickups</h2>
        {pickups.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pickups assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {pickups.map((p) => (
              <div key={p.id} className="glass-card-hover rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-foreground">{p.item}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{p.from_location} → {p.to_location}
                      </span>
                      {p.scheduled_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(p.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.meal_plates} plates</p>
                    {(p.extra_donation_ids?.length ?? 0) > 0 && (
                      <p className="text-xs text-primary">+{p.extra_donation_ids!.length} extra pickup(s)</p>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusBadge(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  {p.status === "pending" && (
                    <button
                      onClick={() => statusMutation.mutate({ id: p.id, status: "in_progress" })}
                      disabled={statusMutation.isPending}
                      className="flex-1 py-2 rounded-xl text-sm font-medium bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors disabled:opacity-60"
                    >
                      🚚 Start Pickup
                    </button>
                  )}
                  {p.status === "in_progress" && (
                    <button
                      onClick={() => statusMutation.mutate({ id: p.id, status: "completed" })}
                      disabled={statusMutation.isPending}
                      className="flex-1 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-60"
                    >
                      ✓ Mark Delivered
                    </button>
                  )}
                  {p.status === "completed" && (
                    <span className="flex-1 py-2 rounded-xl text-sm font-medium text-center bg-muted text-muted-foreground">
                      Delivery Complete
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* En-route opportunity floating alert */}
      {enRouteOpportunity && (
        <OpportunityAlert
          pickupId={enRouteOpportunity.pickupId}
          donations={enRouteOpportunity.donations}
          onDismiss={() => setEnRouteOpportunity(null)}
        />
      )}

      {/* Change password panel */}
      <ChangePasswordForm />
    </div>
  );
};

export default VolunteerDashboard;
