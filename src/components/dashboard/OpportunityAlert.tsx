import { MapPin, Package, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface NearbyDonation {
    id: number;
    title: string;
    meal_plates: number;
    latitude: string;
    longitude: string;
    expiry: string;
}

interface Props {
    pickupId: number;
    donations: NearbyDonation[];
    onDismiss: () => void;
}

export default function OpportunityAlert({ pickupId, donations, onDismiss }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (donationId: number) =>
            api.post(`/pickups/${pickupId}/accept-extra/${donationId}`, {}),
        onSuccess: () => {
            toast({ title: 'Extra pickup accepted! 🚚', description: 'Added to your active delivery.' });
            queryClient.invalidateQueries({ queryKey: ['pickups'] });
            onDismiss();
        },
        onError: (err: Error) =>
            toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' }),
    });

    if (donations.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-yellow-500/30 bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-3 border-b border-yellow-500/20">
                <Zap className="h-4 w-4 text-yellow-500" />
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">En-Route Pickup Opportunity!</p>
            </div>
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {donations.map((d) => (
                    <div key={d.id} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-start justify-between">
                            <span className="text-sm font-medium text-foreground">{d.title}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Package className="h-3 w-3" />{d.meal_plates} plates
                            </span>
                        </div>
                        <Button
                            size="sm"
                            className="w-full"
                            onClick={() => mutation.mutate(d.id)}
                            disabled={mutation.isPending}
                        >
                            Accept Extra Pickup
                        </Button>
                    </div>
                ))}
            </div>
            <div className="px-4 pb-3">
                <button
                    onClick={onDismiss}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
