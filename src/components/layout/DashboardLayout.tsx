import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, LayoutDashboard, Package, Users, Settings, LogOut,
  Bell, Menu, X, BarChart3, Truck, Heart, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const donorNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/donor" },
  { icon: Package, label: "My Donations", path: "/dashboard/donor/donations" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/donor/analytics" },
  { icon: Settings, label: "Settings", path: "/dashboard/donor/settings" },
];

const ngoNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/ngo" },
  { icon: Package, label: "Available Food", path: "/dashboard/ngo/available" },
  { icon: Truck, label: "Pickups", path: "/dashboard/ngo/pickups" },
  { icon: Settings, label: "Settings", path: "/dashboard/ngo/settings" },
];

const volunteerNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/volunteer" },
  { icon: Truck, label: "Assigned Pickups", path: "/dashboard/volunteer/pickups" },
  { icon: Settings, label: "Settings", path: "/dashboard/volunteer/settings" },
];

const riderNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/rider" },
  { icon: Truck, label: "My Pickups", path: "/dashboard/rider" },
  { icon: Settings, label: "Settings", path: "/dashboard/rider" },
];

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/admin" },
  { icon: Users, label: "Users", path: "/dashboard/admin/users" },
  { icon: Shield, label: "Approvals", path: "/dashboard/admin/approvals" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/admin/analytics" },
  { icon: Settings, label: "Settings", path: "/dashboard/admin/settings" },
];

const verifierNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/verifier" },
  { icon: Settings, label: "Settings", path: "/dashboard/verifier/settings" },
];

const roleNavMap: Record<string, NavItem[]> = {
  donor: donorNav,
  ngo: ngoNav,
  rider: riderNav,
  volunteer: volunteerNav,
  admin: adminNav,
  verifier: verifierNav,
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Derive role from URL
  const role = location.pathname.split("/")[2] || "donor";
  const navItems = roleNavMap[role] || donorNav;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="gradient-bg rounded-lg p-1.5">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                Food<span className="text-primary">Bridge</span>
              </span>
            </Link>
            <button
              className="lg:hidden text-muted-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-card">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
            </button>
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
              {(user?.name?.[0] ?? role[0]).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
