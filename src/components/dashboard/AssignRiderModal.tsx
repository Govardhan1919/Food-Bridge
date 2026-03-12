import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Rider {
    id: number;
    name: string;
    vehicle_type: string;
    vehicle_capacity: number;
    is_online: boolean;
}

const VEHICLE_LABELS: Record<string, string> = {
    bike: 'Bike', mini_van: 'Mini Van', van: 'Van', truck: 'Truck',
};

interface Props {
    donationId: number | null;
    donationMealPlates: number;
    open: boolean;
    onClose: () => void;
}

export default function AssignRiderModal({ donationId, donationMealPlates, open, onClose }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedRider, setSelectedRider] = useState<number | null>(null);

    const { data: riders = [] } = useQuery<Rider[]>({
        queryKey: ['riders', 'eligible', donationId],
        queryFn: () => api.get<Rider[]>(`/riders/eligible/${donationId}`),
        enabled: open && donationId !== null,
    });

    const assignMutation = useMutation({
        mutationFn: () =>
            api.post(`/riders/${selectedRider}/assign/${donationId}`, {}),
        onSuccess: () => {
            toast({ title: 'Rider Assigned! 🚴', description: 'The rider has been notified.' });
            queryClient.invalidateQueries({ queryKey: ['donations'] });
            queryClient.invalidateQueries({ queryKey: ['riders'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            onClose();
        },
        onError: (err: Error) =>
            toast({ title: 'Assignment failed', description: err.message, variant: 'destructive' }),
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        Assign a Rider
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Showing riders who are <strong>online</strong> with capacity ≥ <strong>{donationMealPlates} plates</strong>.
                </p>
                {riders.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                        No eligible riders available right now. Ask a rider to go online or increase their vehicle capacity.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {riders.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedRider(r.id)}
                                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors text-left ${selectedRider === r.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:bg-muted'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{r.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {VEHICLE_LABELS[r.vehicle_type] ?? r.vehicle_type} · {r.vehicle_capacity} plates
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-green-500 font-medium">● Online</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button
                        className="flex-1"
                        disabled={selectedRider === null || assignMutation.isPending}
                        onClick={() => assignMutation.mutate()}
                    >
                        {assignMutation.isPending ? 'Assigning…' : 'Confirm Assignment'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
