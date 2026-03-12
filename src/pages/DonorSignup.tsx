import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Mail, Lock, User, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DonorSignup = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [coords, setCoords] = useState<{ lat: string; lon: string } | null>(null);
    const [locating, setLocating] = useState(false);
    const { register, isLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const detectLocation = () => {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({
                    lat: String(pos.coords.latitude),
                    lon: String(pos.coords.longitude),
                });
                setLocating(false);
            },
            () => {
                toast({ title: "Location unavailable", description: "You can add it later from your profile.", variant: "destructive" });
                setLocating(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(form.name, form.email, form.password, "donor", {
                latitude: coords?.lat ?? null,
                longitude: coords?.lon ?? null,
            });
            toast({ title: "Welcome to FoodBridge! 🍱", description: "Your donor account is ready." });
            navigate("/dashboard/donor");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Registration failed";
            toast({ title: "Registration failed", description: message, variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-20 left-20 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="gradient-bg rounded-lg p-1.5">
                            <Leaf className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="font-display text-xl font-bold text-foreground">
                            Food<span className="text-primary">Bridge</span>
                        </span>
                    </Link>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                        🍱 Donor Account
                    </div>
                    <h1 className="font-display text-3xl font-bold text-foreground">Start Donating</h1>
                    <p className="text-muted-foreground mt-2">Create your donor account and make an impact</p>
                </div>

                <div className="glass-card rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name / Organisation Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    placeholder="e.g. Raj's Kitchen or Raj Kumar"
                                    className="pl-10"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="pl-10"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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

                        {/* Default Pickup Location */}
                        <div className="space-y-2">
                            <Label>Default Pickup Location <span className="text-muted-foreground text-xs">(optional — helps NGOs find you)</span></Label>
                            {coords ? (
                                <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                                    <span>{parseFloat(coords.lat).toFixed(5)}, {parseFloat(coords.lon).toFixed(5)}</span>
                                    <button type="button" className="ml-auto text-xs underline text-primary" onClick={detectLocation}>
                                        Re-detect
                                    </button>
                                </div>
                            ) : (
                                <Button type="button" variant="outline" className="w-full gap-2" onClick={detectLocation} disabled={locating}>
                                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                    {locating ? "Detecting…" : "Use My Current Location"}
                                </Button>
                            )}
                        </div>

                        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                            {isLoading ? "Creating account…" : "Create Donor Account"}
                        </Button>
                    </form>

                    <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
                        <p>
                            Want to register as an NGO?{" "}
                            <Link to="/signup/ngo" className="text-primary font-medium hover:underline">Join as NGO</Link>
                        </p>
                        <p>
                            Already have an account?{" "}
                            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DonorSignup;
