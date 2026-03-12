import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Rider-friendly role path mapping
const rolePath: Record<string, string> = {
  donor: "donor", ngo: "ngo", rider: "rider", admin: "admin", verifier: "verifier"
};

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(credential, password, mode === "phone");
      toast({ title: "Welcome back!", description: `Signed in as ${user.name}` });
      navigate(`/dashboard/${rolePath[user.role] ?? user.role}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    }
  };

  const switchMode = (m: "email" | "phone") => {
    setMode(m);
    setCredential("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="gradient-bg rounded-lg p-1.5">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Food<span className="text-primary">Bridge</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to continue your impact</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {/* Email / Phone toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden mb-5">
            {(["email", "phone"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
                  }`}
              >
                {m === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                {m === "email" ? "Email" : "Mobile No."}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="credential">
                {mode === "email" ? "Email Address" : "Mobile Number"}
              </Label>
              <div className="relative">
                {mode === "email"
                  ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                }
                <Input
                  id="credential"
                  type={mode === "email" ? "email" : "tel"}
                  placeholder={mode === "email" ? "you@example.com" : "+91 98765 43210"}
                  className="pl-10"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "phone" && (
              <p className="text-xs text-muted-foreground">
                🔑 Riders: use the mobile number and temporary password provided by your NGO.
                You can change your password after logging in.
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
