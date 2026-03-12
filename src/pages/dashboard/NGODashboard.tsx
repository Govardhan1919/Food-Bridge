import { useState } from "react";
import { Package, Users, Truck, CheckCircle } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import RiderManagePanel from "@/components/dashboard/RiderManagePanel";
import AssignRiderModal from "@/components/dashboard/AssignRiderModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { Clock, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Donation {
  id: number;
  title: string;
  meal_plates: number;
  expiry: string;
  latitude: string;
  longitude: string;
  status: "pending_verification" | "available" | "accepted" | "picked_up" | "delivered";
  donor_name?: string;
}

interface NgoStats {
  available: number;
  accepted: number;
  inTransit: number;
  activeVolunteers: number;
}

const statusColors: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-info/10 text-info border-info/20",
  picked_up: "bg-warning/10 text-warning border-warning/20",
  delivered: "bg-success/10 text-success border-success/20",
};
const statusLabels: Record<string, string> = {
  available: "Available", accepted: "Accepted", picked_up: "In Transit", delivered: "Delivered",
};

const NGODashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignModal, setAssignModal] = useState<{ donationId: number; mealPlates: number } | null>(null);

  const { data: donations = [] } = useQuery<Donation[]>({
    queryKey: ["donations", "nearby"],
    queryFn: () => api.get<Donation[]>("/donations/nearby"),
  });

  const { data: stats } = useQuery<NgoStats>({
    queryKey: ["stats"],
    queryFn: () => api.get<NgoStats>("/stats"),
  });

  // Real-time: new donation nearby
  useSocket(user?.id, {
    new_donation: (data: unknown) => {
      const d = data as { donation: Donation };
      toast({
        title: "🍱 New Donation Nearby!",
        description: `"${d.donation.title}" — ${d.donation.meal_plates} plates`,
      });
      queryClient.invalidateQueries({ queryKey: ["donations", "nearby"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (donation: Donation) => {
      await api.patch(`/donations/${donation.id}/status`, { status: "accepted" });
    },
    onSuccess: (_, donation) => {
      toast({ title: "Donation accepted!", description: "Now assign a rider to the pickup." });
      queryClient.invalidateQueries({ queryKey: ["donations", "nearby"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setAssignModal({ donationId: donation.id, mealPlates: donation.meal_plates });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to accept donation", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">NGO Dashboard</h1>
        <p className="text-muted-foreground text-sm">Browse and accept food donations in your area</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Package} label="Available Nearby" value={String(donations.length)} />
        <StatsCard icon={CheckCircle} label="Accepted" value={String(stats?.accepted ?? 0)} />
        <StatsCard icon={Truck} label="In Transit" value={String(stats?.inTransit ?? 0)} />
        <StatsCard icon={Users} label="Active Riders" value={String(stats?.activeVolunteers ?? 0)} />
      </div>

      <Tabs defaultValue="donations">
        <TabsList className="mb-4">
          <TabsTrigger value="donations">Available Donations</TabsTrigger>
          <TabsTrigger value="riders">Rider Management</TabsTrigger>
        </TabsList>

        <TabsContent value="donations">
          {donations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No available donations nearby.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {donations.map((d) => (
                <div key={d.id} className="glass-card-hover rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-foreground">{d.title}</h3>
                      <p className="text-sm text-muted-foreground">{d.meal_plates} meal plates</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[d.status] ?? ''}`}>
                      {statusLabels[d.status] ?? d.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Expires: {d.expiry}</span>
                    {d.donor_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{d.donor_name}</span>}
                  </div>
                  {d.status === "available" && (
                    <button
                      onClick={() => acceptMutation.mutate(d)}
                      disabled={acceptMutation.isPending}
                      className="w-full mt-1 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {acceptMutation.isPending ? "Accepting…" : "✓ Accept Donation"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="riders">
          <RiderManagePanel />
        </TabsContent>
      </Tabs>

      {/* Assign rider modal — appears after accepting */}
      {assignModal && (
        <AssignRiderModal
          open={assignModal !== null}
          donationId={assignModal.donationId}
          donationMealPlates={assignModal.mealPlates}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
};

export default NGODashboard;
