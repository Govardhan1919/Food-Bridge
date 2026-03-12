import { useState } from "react";
import { motion } from "framer-motion";
import {
    Truck, CheckCircle, Clock, MapPin, User, Wifi, WifiOff,
    Package, History, ChevronRight, IdCard, Car, FileText, Home,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import OnlineToggle from "@/components/dashboard/OnlineToggle";
import OpportunityAlert from "@/components/dashboard/OpportunityAlert";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
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

interface RiderStats {
    activePickups: number;
    completed: number;
    totalPickups: number;
}

const VEHICLE_LABELS: Record<string, string> = {
    bike: "Bike", mini_van: "Mini Van", van: "Van", truck: "Truck",
};

const statusLabel = (s: string) =>
    s === "completed" ? "Completed" : s === "in_progress" ? "In Progress" : "Pending";

const statusBadge = (s: string) =>
    s === "completed"
        ? "bg-primary/10 text-primary border-primary/20"
        : s === "in_progress"
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
            : "bg-muted text-muted-foreground border-border";

type Tab = "pickups" | "history" | "profile";

const RiderDashboard = () => {
    const { toast } = useToast();
    const { user, refreshUser } = useAuth();
    const queryClient = useQueryClient();
    const [isOnline, setIsOnline] = useState(user?.is_online ?? false);
    const [activeTab, setActiveTab] = useState<Tab>("pickups");
    const [enRouteOpportunity, setEnRouteOpportunity] = useState<{
        pickupId: number; donations: NearbyDonation[];
    } | null>(null);

    const { data: pickups = [] } = useQuery<Pickup[]>({
        queryKey: ["pickups"],
        queryFn: () => api.get<Pickup[]>("/pickups"),
    });

    const { data: stats } = useQuery<RiderStats>({
        queryKey: ["stats"],
        queryFn: () => api.get<RiderStats>("/stats"),
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
                toast({
                    title: "🚗 Extra Pickup Nearby!",
                    description: `${d.donations.length} donation(s) on your route with ${d.remainingCapacity} plates remaining.`,
                });
            }
        },
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.patch(`/pickups/${id}/status`, { status }),
        onSuccess: () => {
            toast({ title: "Pickup updated!", description: "Status has been saved." });
            queryClient.invalidateQueries({ queryKey: ["pickups"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
        onError: (err: Error) =>
            toast({ title: "Update failed", description: err.message, variant: "destructive" }),
    });

    const activePickups = pickups.filter((p) => p.status !== "completed");
    const completedPickups = pickups.filter((p) => p.status === "completed");

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: "pickups", label: "Pickups", icon: Truck },
        { id: "history", label: "History", icon: History },
        { id: "profile", label: "Profile", icon: User },
    ];

    return (
        <div className="space-y-6">
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />

            {/* Online / Offline Toggle */}
            {user && (
                <OnlineToggle riderId={user.id} isOnline={isOnline} onToggle={setIsOnline} />
            )}

            {/* Header */}
            <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Rider Dashboard</h1>
                <p className="text-muted-foreground text-sm">
                    Welcome, <span className="font-medium text-foreground">{user?.name}</span>
                    {user?.vehicle_type && (
                        <> &bull; {VEHICLE_LABELS[user.vehicle_type] ?? user.vehicle_type} &bull; {user.vehicle_capacity} plates</>
                    )}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatsCard icon={Truck} label="Active" value={String(stats?.activePickups ?? 0)} />
                <StatsCard icon={CheckCircle} label="Completed" value={String(stats?.completed ?? 0)} />
                <StatsCard icon={Clock} label="Total" value={String(stats?.totalPickups ?? 0)} />
            </div>

            {/* Tab Bar */}
            <div className="flex rounded-xl border border-border overflow-hidden">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${activeTab === t.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                            }`}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── PICKUPS TAB ─── */}
            {activeTab === "pickups" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {!isOnline && (
                        <div className="flex items-center gap-3 rounded-2xl border border-muted bg-muted/40 px-5 py-3">
                            <WifiOff className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                You are offline. Switch online to receive pickup notifications.
                            </p>
                        </div>
                    )}

                    {activePickups.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            No active pickups assigned yet.
                        </div>
                    ) : (
                        activePickups.map((p) => (
                            <div key={p.id} className="glass-card-hover rounded-2xl p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 flex-1">
                                        <h3 className="font-display font-semibold text-foreground">{p.item}</h3>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{p.from_location}</span>
                                            <ChevronRight className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{p.to_location}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{p.meal_plates} meal plates</p>
                                        {(p.extra_donation_ids?.length ?? 0) > 0 && (
                                            <p className="text-xs text-primary">+{p.extra_donation_ids!.length} extra pickup(s)</p>
                                        )}
                                        {p.scheduled_time && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(p.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${statusBadge(p.status)}`}>
                                        {statusLabel(p.status)}
                                    </span>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    {p.status === "pending" && (
                                        <button
                                            onClick={() => statusMutation.mutate({ id: p.id, status: "in_progress" })}
                                            disabled={statusMutation.isPending}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-60"
                                        >
                                            🚚 Start Pickup
                                        </button>
                                    )}
                                    {p.status === "in_progress" && (
                                        <button
                                            onClick={() => statusMutation.mutate({ id: p.id, status: "completed" })}
                                            disabled={statusMutation.isPending}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-60"
                                        >
                                            ✓ Mark Delivered
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            )}

            {/* ─── HISTORY TAB ─── */}
            {activeTab === "history" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <h2 className="font-display text-lg font-semibold text-foreground">Completed Rides</h2>
                    {completedPickups.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            No completed rides yet.
                        </div>
                    ) : (
                        completedPickups.map((p) => (
                            <div key={p.id} className="glass-card rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary shrink-0" />
                                        <p className="text-sm font-medium text-foreground">{p.item}</p>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-primary/10 text-primary border-primary/20">
                                        Completed ✓
                                    </span>
                                </div>
                                <div className="pl-6 text-xs text-muted-foreground space-y-1">
                                    <p className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {p.from_location} → {p.to_location}
                                    </p>
                                    <p>{p.meal_plates} plates delivered</p>
                                    {(p.extra_donation_ids?.length ?? 0) > 0 && (
                                        <p className="text-primary">+{p.extra_donation_ids!.length} extra pickup(s)</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            )}

            {/* ─── PROFILE TAB ─── */}
            {activeTab === "profile" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <h2 className="font-display text-lg font-semibold text-foreground">My Profile</h2>

                    <div className="glass-card rounded-2xl p-5 space-y-4">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
                                {user?.name?.[0]?.toUpperCase() ?? "R"}
                            </div>
                            <div>
                                <p className="font-semibold text-foreground text-lg">{user?.name}</p>
                                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${isOnline ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                                    {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                    {isOnline ? "Online" : "Offline"}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                            {[
                                { icon: Car, label: "Vehicle Type", value: user?.vehicle_type ? `${VEHICLE_LABELS[user.vehicle_type]} · ${user.vehicle_capacity} plates` : "—" },
                                { icon: IdCard, label: "Phone", value: user?.phone ?? "—" },
                                { icon: FileText, label: "Email", value: user?.email ?? "—" },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                                    <Icon className="h-4 w-4 text-primary shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        <p className="text-sm font-medium text-foreground">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Change Password */}
                    <ChangePasswordForm />
                </motion.div>
            )}

            {/* En-route opportunity floating alert */}
            {enRouteOpportunity && (
                <OpportunityAlert
                    pickupId={enRouteOpportunity.pickupId}
                    donations={enRouteOpportunity.donations}
                    onDismiss={() => setEnRouteOpportunity(null)}
                />
            )}
        </div>
    );
};

export default RiderDashboard;
