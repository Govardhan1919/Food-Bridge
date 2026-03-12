import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Package, TrendingUp, Video, Building2, Truck,
  ChevronDown, ChevronRight, Wifi, WifiOff, CheckCircle,
  Shield, Phone, Mail, Car, IdCard,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import { UserCheck, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface AdminStats {
  totalUsers: number;
  totalDonations: number;
  mealsSaved: number;
  pendingApprovals: number;
  monthlyData: { month: string; donations: number }[];
  roleData: { role: string; value: number }[];
}

interface Donor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  verified_badge: boolean;
  donation_count: number;
  created_at: string;
}

interface NGO {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  rider_count: string;
  donation_count: string;
  created_at: string;
}

interface Rider {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_online: boolean;
  vehicle_type: string | null;
  vehicle_capacity: number | null;
  aadhaar_no: string | null;
  vehicle_no: string | null;
  address: string | null;
  driving_licence_no: string | null;
  created_at: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  bike: "Bike", mini_van: "Mini Van", van: "Van", truck: "Truck",
};

const ROLE_COLORS: Record<string, string> = {
  donor: "hsl(152, 62%, 36%)", ngo: "hsl(210, 80%, 55%)",
  rider: "hsl(38, 92%, 55%)", admin: "hsl(0, 70%, 50%)",
};

// ── NGO Card with collapsible riders ────────────────────────────────────────
function NGOCard({ ngo }: { ngo: NGO }) {
  const [expanded, setExpanded] = useState(false);

  const { data: riders = [], isLoading } = useQuery<Rider[]>({
    queryKey: ["ngo-riders", ngo.id],
    queryFn: () => api.get<Rider[]>(`/ngos/${ngo.id}/riders`),
    enabled: expanded,
  });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* NGO Header Row */}
      <button
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-display font-bold shrink-0">
          {ngo.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{ngo.name}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {ngo.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{ngo.email}</span>}
            {ngo.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{ngo.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{ngo.rider_count}</p>
            <p className="text-xs text-muted-foreground">Riders</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{ngo.donation_count}</p>
            <p className="text-xs text-muted-foreground">Donations</p>
          </div>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Rider List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-muted/20">
              {isLoading && (
                <p className="text-sm text-center text-muted-foreground py-4">Loading riders…</p>
              )}
              {!isLoading && riders.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 justify-center">
                  <Truck className="h-4 w-4" />
                  No riders registered under this NGO
                </div>
              )}
              {riders.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {r.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                      {r.vehicle_type && (
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {VEHICLE_LABELS[r.vehicle_type] ?? r.vehicle_type} · {r.vehicle_capacity} plates
                        </span>
                      )}
                      {r.vehicle_no && <span className="flex items-center gap-1"><IdCard className="h-3 w-3" />{r.vehicle_no}</span>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${r.is_online ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {r.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {r.is_online ? "Online" : "Offline"}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["stats"],
    queryFn: () => api.get<AdminStats>("/stats"),
  });

  const { data: ngos = [] } = useQuery<NGO[]>({
    queryKey: ["ngos"],
    queryFn: () => api.get<NGO[]>("/ngos"),
  });

  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: ["admin-donors"],
    queryFn: () => api.get<Donor[]>("/users/donors"),
  });

  const verifiedDonors = donors.filter((d) => d.verified_badge);
  const unverifiedDonors = donors.filter((d) => !d.verified_badge);

  const monthlyData = stats?.monthlyData ?? [];
  const roleData = (stats?.roleData ?? []).map((r) => ({
    ...r,
    name: r.role.charAt(0).toUpperCase() + r.role.slice(1) + "s",
    color: ROLE_COLORS[r.role] ?? "hsl(0,0%,50%)",
  }));

  const totalRiders = ngos.reduce((sum, n) => sum + parseInt(n.rider_count || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform overview and management</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard icon={Users} label="Total Users" value={String(stats?.totalUsers ?? 0)} />
        <StatsCard icon={Package} label="Total Donations" value={String(stats?.totalDonations ?? 0)} />
        <StatsCard icon={Building2} label="NGOs" value={String(ngos.length)} />
        <StatsCard icon={Users} label="Total Donors" value={String(donors.length)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ngos">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="ngos" className="gap-2">
            <Building2 className="h-4 w-4" /> NGOs & Riders
          </TabsTrigger>
          <TabsTrigger value="donors" className="gap-2">
            <Users className="h-4 w-4" /> Donors List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ── NGOs & Riders Tab ── */}
        <TabsContent value="ngos">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                All NGOs <span className="text-muted-foreground font-normal text-base">({ngos.length})</span>
              </h2>
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-4 w-4" /> {totalRiders} total riders
              </span>
            </div>

            {ngos.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm">No NGOs registered yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ngos.map((ngo) => (
                  <NGOCard key={ngo.id} ngo={ngo} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Donors Tab ── */}
        <TabsContent value="donors">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-5 w-5 text-green-500" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Verified Donors <span className="text-muted-foreground text-sm font-normal">({verifiedDonors.length})</span>
                </h2>
              </div>
              {verifiedDonors.length === 0 ? (
                <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">No verified donors yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {verifiedDonors.map((d) => (
                    <div key={d.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {d.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{d.email}</span>}
                          {d.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">Verified</span>
                        <p className="text-xs text-muted-foreground mt-2">{d.donation_count} donations</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserX className="h-5 w-5 text-amber-500" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Under Verification <span className="text-muted-foreground text-sm font-normal">({unverifiedDonors.length})</span>
                </h2>
              </div>
              {unverifiedDonors.length === 0 ? (
                <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">No donors under verification.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unverifiedDonors.map((d) => (
                    <div key={d.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {d.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{d.email}</span>}
                          {d.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">Learning ({d.donation_count}/5)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Monthly Donations</h3>
              {monthlyData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem" }} />
                    <Bar dataKey="donations" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">User Distribution</h3>
              {roleData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No data yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {roleData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2 flex-wrap">
                    {roleData.map((r) => (
                      <div key={r.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-muted-foreground">{r.name} ({r.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Summary Cards */}
            <div className="lg:col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
                { label: "Total Donations", value: stats?.totalDonations ?? 0, icon: Package },
                { label: "Meals Saved", value: stats?.mealsSaved ?? 0, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
