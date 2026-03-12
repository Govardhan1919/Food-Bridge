import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DonorSignup from "./pages/DonorSignup";
import NGOSignup from "./pages/NGOSignup";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";
import DonorDashboard from "./pages/dashboard/DonorDashboard";
import NGODashboard from "./pages/dashboard/NGODashboard";
import RiderDashboard from "./pages/dashboard/RiderDashboard";
import VolunteerDashboard from "./pages/dashboard/VolunteerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import VerifierDashboard from "./pages/dashboard/VerifierDashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

// Protected route — redirects to /login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            {/* Role-specific signup pages */}
            <Route path="/signup/donor" element={<DonorSignup />} />
            <Route path="/signup/ngo" element={<NGOSignup />} />
            {/* Old /signup redirects to donor signup */}
            <Route path="/signup" element={<DonorSignup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="donor" element={<DonorDashboard />} />
              <Route path="ngo" element={<NGODashboard />} />
              <Route path="rider" element={<RiderDashboard />} />
              <Route path="volunteer" element={<VolunteerDashboard />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="verifier" element={<VerifierDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
