import { useState } from "react";
import { X, Plus, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface NewDonationModalProps {
    open: boolean;
    onClose: () => void;
}

interface DonationPayload {
    title: string;
    meal_plates: number;
    expiry: string;
    latitude: string;
    longitude: string;
    scheduled_at?: string;
}

const NewDonationModal = ({ open, onClose }: NewDonationModalProps) => {
    const { user } = useAuth();
    const needsVerification = user?.role === "donor" && !user?.verified_badge;
    const [form, setForm] = useState({ title: "", meal_plates: "", expiry: "", scheduled_at: "" });
    const [locating, setLocating] = useState(false);
    const [coords, setCoords] = useState<{ lat: string; lon: string } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const detectLocation = () => {
        setLocating(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) });
                setLocating(false);
            },
            (err) => {
                setLocationError("Could not detect location: " + err.message);
                setLocating(false);
            }
        );
    };

    const mutation = useMutation({
        mutationFn: (payload: DonationPayload) => api.post<unknown>("/donations", payload),
        onSuccess: (_, payload) => {
            const isPending = payload.meal_plates > 0; // server decides based on badge
            toast({
                title: "Donation submitted!",
                description: "Your donation has been submitted.",
            });
            queryClient.invalidateQueries({ queryKey: ["donations"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            setForm({ title: "", meal_plates: "", expiry: "", scheduled_at: "" });
            setCoords(null);
            onClose();
        },
        onError: (err: Error) => {
            toast({ title: "Failed to create donation", description: err.message, variant: "destructive" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!coords) { setLocationError("Please detect your location first."); return; }
        mutation.mutate({
            title: form.title,
            meal_plates: parseInt(form.meal_plates),
            expiry: form.expiry,
            latitude: coords.lat,
            longitude: coords.lon,
            scheduled_at: form.scheduled_at || undefined,
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-foreground">New Donation</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="dn-title">Donation Title</Label>
                        <Input
                            id="dn-title"
                            placeholder="e.g. Wedding biryani – 100 plates"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    {/* Meal Plates */}
                    <div className="space-y-1.5">
                        <Label htmlFor="dn-plates">Number of Meal Plates</Label>
                        <Input
                            id="dn-plates"
                            type="number"
                            min={1}
                            placeholder="e.g. 50"
                            value={form.meal_plates}
                            onChange={(e) => setForm({ ...form, meal_plates: e.target.value })}
                            required
                        />
                    </div>

                    {/* Expiry */}
                    <div className="space-y-1.5">
                        <Label htmlFor="dn-expiry">Expiry / Best-before</Label>
                        <Input
                            id="dn-expiry"
                            placeholder="e.g. Today 8 PM"
                            value={form.expiry}
                            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                            required
                        />
                    </div>

                    {/* Scheduled Call Time (if unverified) */}
                    {needsVerification && (
                        <div className="space-y-1.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <Label htmlFor="dn-schedule" className="text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                Schedule Verification Call
                            </Label>
                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mb-2">
                                Since you are a new donor, a quick verification call is required.
                            </p>
                            <Input
                                id="dn-schedule"
                                type="datetime-local"
                                value={form.scheduled_at}
                                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                                required={needsVerification}
                            />
                        </div>
                    )}

                    {/* Location */}
                    <div className="space-y-1.5">
                        <Label>Pickup Location</Label>
                        {coords ? (
                            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 text-primary shrink-0" />
                                <span className="truncate">
                                    {parseFloat(coords.lat).toFixed(5)}, {parseFloat(coords.lon).toFixed(5)}
                                </span>
                                <button
                                    type="button"
                                    className="ml-auto text-xs underline text-primary"
                                    onClick={detectLocation}
                                >
                                    Re-detect
                                </button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={detectLocation}
                                disabled={locating}
                            >
                                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                {locating ? "Detecting location…" : "Detect My Location"}
                            </Button>
                        )}
                        {locationError && (
                            <p className="text-xs text-destructive">{locationError}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full gap-2 mt-2" disabled={mutation.isPending || !coords}>
                        <Plus className="h-4 w-4" />
                        {mutation.isPending ? "Creating…" : "Create Donation"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default NewDonationModal;
