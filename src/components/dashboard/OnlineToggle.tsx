import { Switch } from '@/components/ui/switch';
import { Wifi, WifiOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface Props {
    riderId: number;
    isOnline: boolean;
    onToggle: (newState: boolean) => void;
}

export default function OnlineToggle({ riderId, isOnline, onToggle }: Props) {
    const { toast } = useToast();
    const { refreshUser } = useAuth();

    const mutation = useMutation({
        mutationFn: (online: boolean) =>
            api.patch(`/riders/${riderId}/status`, { is_online: online }),
        onSuccess: (_, online) => {
            onToggle(online);
            refreshUser();
            toast({
                title: online ? '🟢 You are now Online' : '🔴 You are now Offline',
                description: online
                    ? 'You will receive pickup notifications.'
                    : 'You will not receive any new pickup requests.',
            });
        },
        onError: (err: Error) =>
            toast({ title: 'Failed to update status', description: err.message, variant: 'destructive' }),
    });

    return (
        <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3 transition-colors ${isOnline ? 'border-green-500/30 bg-green-500/10' : 'border-muted bg-muted/40'}`}>
            {isOnline
                ? <Wifi className="h-5 w-5 text-green-500" />
                : <WifiOff className="h-5 w-5 text-muted-foreground" />
            }
            <div className="flex-1">
                <p className={`text-sm font-semibold ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {isOnline ? 'Online — Accepting Pickups' : 'Offline — Not Receiving Notifications'}
                </p>
                <p className="text-xs text-muted-foreground">Toggle to change your availability</p>
            </div>
            <Switch
                checked={isOnline}
                onCheckedChange={(v) => mutation.mutate(v)}
                disabled={mutation.isPending}
            />
        </div>
    );
}
