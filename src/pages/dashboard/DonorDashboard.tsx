import { useState } from "react";
import { Package, TrendingUp, Clock, CheckCircle, Plus, Video } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import DonationCard from "@/components/dashboard/DonationCard";
import NewDonationModal from "@/components/dashboard/NewDonationModal";
import VerificationBanner from "@/components/dashboard/VerificationBanner";
import VideoCallModal from "@/components/dashboard/VideoCallModal";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";

interface Donation {
  id: number;
  title: string;
  meal_plates: number;
  expiry: string;
  latitude: string;
  longitude: string;
  status: "pending_verification" | "available" | "accepted" | "picked_up" | "delivered";
  scheduled_at?: string;
}

interface DonorStats {
  totalDonations: number;
  mealsSaved: number;
  pending: number;
  completed: number;
}

const DonorDashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: donations = [] } = useQuery<Donation[]>({
    queryKey: ["donations"],
    queryFn: () => api.get<Donation[]>("/donations"),
  });

  const { data: stats } = useQuery<DonorStats>({
    queryKey: ["stats"],
    queryFn: () => api.get<DonorStats>("/stats"),
  });

  // Real-time socket listeners
  useSocket(user?.id, {
    verification_complete: (data: unknown) => {
      const d = data as { donationCount: number; verifiedBadge: boolean };
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      refreshUser();
      toast({
        title: "Verification Complete ✅",
        description: `Your donation has been approved! (${d.donationCount}/5 verified)`,
      });
    },
    badge_earned: (data: unknown) => {
      const d = data as { message: string };
      refreshUser();
      toast({ title: "Verified Donor 🏅", description: d.message });
    },
    incoming_video_call: (data: unknown) => {
      const d = data as { donationId: number; verifierName: string };
      setActiveCallId(d.donationId);
      toast({
        title: "Incoming Video Call 📞",
        description: `${d.verifierName || 'A verifier'} is calling you for verification!`,
        duration: 8000,
      });
    },
  });

  const hasPendingVerification = donations.some((d) => d.status === "pending_verification");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Donor Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage your food donations</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Donation
        </Button>
      </div>

      {/* Verification status banner */}
      <VerificationBanner
        donationCount={user?.donation_count ?? 0}
        verifiedBadge={user?.verified_badge ?? false}
        hasPendingVerification={hasPendingVerification}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Package} label="Total Donations" value={String(stats?.totalDonations ?? 0)} />
        <StatsCard icon={TrendingUp} label="Meals Saved" value={String(stats?.mealsSaved ?? 0)} />
        <StatsCard icon={Clock} label="Pending" value={String(stats?.pending ?? 0)} />
        <StatsCard icon={CheckCircle} label="Completed" value={String(stats?.completed ?? 0)} />
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Recent Donations</h2>
        {donations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No donations yet. Create your first donation!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {donations.map((d) => (
              <div key={d.id} className="relative">
                <DonationCard {...d} quantity={String(d.meal_plates) + " plates"} />
                {d.status === "pending_verification" && (
                  {/* Removed Join Call button according to user request - only verifiers initiate calls */ }
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <NewDonationModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Video Call Modal */}
      <VideoCallModal
        open={activeCallId !== null}
        onClose={() => setActiveCallId(null)}
        roomId={`FoodBridge-Verification-Donation-${activeCallId}`}
        userName={user?.name || "Donor"}
        role="donor"
      />
    </div>
  );
};

export default DonorDashboard;
