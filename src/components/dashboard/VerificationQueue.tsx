import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Video, CheckCircle, Clock, User, Package,
    ShieldCheck, MapPin, Phone, Scale, Leaf, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCallModal from './VideoCallModal';
import { useAuth } from '@/context/AuthContext';

interface VerificationCall {
    id: number;
    donor_name: string;
    donor_email: string;
    title: string;
    meal_plates: number;
    expiry: string;
    latitude: string;
    longitude: string;
    status: 'pending' | 'completed';
    scheduled_at?: string;
    created_at: string;
    donation_id: number;
}

// ── Checklist items every verification must cover ────────────────────────────
const CHECKLIST_ITEMS = [
    { id: 'identity', icon: User, label: 'Donor identity confirmed on video call' },
    { id: 'food', icon: Leaf, label: 'Food type and quality visually verified' },
    { id: 'quantity', icon: Scale, label: 'Meal plate count matches the listing' },
    { id: 'location', icon: MapPin, label: 'Pickup location is accurate and accessible' },
    { id: 'contact', icon: Phone, label: 'Donor is reachable and responsive' },
    { id: 'safety', icon: ShieldCheck, label: 'Food safety / hygiene standards confirmed' },
];

// ── Single verification card ─────────────────────────────────────────────────
function VerificationCard({
    call, onComplete,
}: {
    call: VerificationCall;
    onComplete: (id: number) => void;
}) {
    const { user } = useAuth();
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [isCallOpen, setIsCallOpen] = useState(false);
    const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);

    const toggle = (id: string) =>
        setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

    const checkedCount = Object.values(checked).filter(Boolean).length;

    return (
        <div className="glass-card-hover rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3">
                <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{call.donor_name}</span>
                        {call.donor_email && (
                            <span className="text-xs text-muted-foreground">{call.donor_email}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {call.title} &bull; {call.meal_plates} plates
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {call.expiry}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {parseFloat(call.latitude).toFixed(4)}, {parseFloat(call.longitude).toFixed(4)}
                        </span>
                        {call.scheduled_at && (
                            <span className="flex items-center gap-1 text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3" />
                                Scheduled: {new Date(call.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(call.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 ml-3">
                    Pending Call
                </span>
            </div>

            {/* Default UI: Only show join button on the card. Checklist moves to modal. */}
            <div className="px-5 pb-5 pt-2">
                <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => {
                        setIsCallOpen(true);
                        api.post(`/verification/${call.id}/ring`, {}).catch(console.error);
                    }}
                >
                    <Video className="h-4 w-4" />
                    Join Video Call
                </Button>
            </div>

            {/* The Video Call Modal with the Checklist Sidebar */}
            <VideoCallModal
                open={isCallOpen}
                onClose={() => setIsCallOpen(false)}
                roomId={`FoodBridge-Verification-Donation-${call.donation_id}`}
                userName={user?.name || 'Verifier'}
                role="verifier"
            >
                <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-border bg-card">
                        <h3 className="font-display font-semibold text-foreground mb-1">Verification Checklist</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Please complete this checklist during your call with <strong className="text-foreground">{call.donor_name}</strong> to verify the donation of {call.meal_plates} plates.
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">
                                Progress
                            </span>
                            <span className="text-xs font-bold text-primary">
                                {checkedCount}/{CHECKLIST_ITEMS.length}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                            <motion.div
                                className="h-full bg-primary rounded-full"
                                animate={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {CHECKLIST_ITEMS.map((item) => {
                                const isChecked = !!checked[item.id];
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => toggle(item.id)}
                                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${isChecked
                                            ? 'border-primary/40 bg-primary/8 text-primary'
                                            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground'
                                            }`}>
                                            <AnimatePresence>
                                                {isChecked && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <item.icon className="h-4 w-4 shrink-0" />
                                        <span className={`text-sm ${isChecked ? 'line-through opacity-70' : ''}`}>
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 mt-auto border-t border-border bg-card">
                        {!allChecked && (
                            <p className="text-xs text-amber-600 text-center mb-3">
                                ⚠️ Complete all {CHECKLIST_ITEMS.length - checkedCount} remaining checklist items to enable approval
                            </p>
                        )}
                        <Button
                            className="w-full gap-2"
                            size="sm"
                            disabled={!allChecked}
                            onClick={() => {
                                onComplete(call.id);
                                setIsCallOpen(false);
                            }}
                        >
                            {allChecked
                                ? <><CheckCircle className="h-4 w-4" /> Approve Donation</>
                                : <><Video className="h-4 w-4" /> Complete checklist first</>
                            }
                        </Button>
                    </div>
                </div>
            </VideoCallModal>
        </div>
    );
}

// ── Main Verification Queue ──────────────────────────────────────────────────
export default function VerificationQueue() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: calls = [] } = useQuery<VerificationCall[]>({
        queryKey: ['verification-calls'],
        queryFn: () => api.get<VerificationCall[]>('/verification'),
        refetchInterval: 30000,
    });

    const completeMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/verification/${id}/complete`, {}),
        onSuccess: (data: { donation_count: number }) => {
            const count = data?.donation_count ?? 0;
            const badgeEarned = count >= 5;
            toast({
                title: badgeEarned
                    ? '🏅 Verified Donor Badge Awarded!'
                    : '✅ Verification complete',
                description: badgeEarned
                    ? `Donor now has ${count} verified donations and earned the Verified Donor badge. Future donations go live instantly!`
                    : `Donation is now live on the NGO dashboard. Donor has ${count}/5 verified donations.`,
            });
            queryClient.invalidateQueries({ queryKey: ['verification-calls'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
        onError: (err: Error) =>
            toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">Verification Queue</h3>
                {calls.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{calls.length} pending</Badge>
                )}
                {calls.length === 0 && (
                    <Badge variant="outline" className="ml-2 text-green-600 border-green-500/30 bg-green-500/10">
                        All clear ✓
                    </Badge>
                )}
            </div>

            {/* Auto-badge info card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
                <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-foreground">Auto-Verification Badge</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Once a donor completes <strong>5 verified calls</strong>, they earn the
                        <strong> Verified Donor badge 🏅</strong>. Their future donations skip this queue
                        and appear instantly on the NGO dashboard.
                    </p>
                </div>
            </div>

            {calls.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No pending verification calls. All caught up!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {calls.map((c) => (
                        <VerificationCard
                            key={c.id}
                            call={c}
                            onComplete={(id) => completeMutation.mutate(id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
