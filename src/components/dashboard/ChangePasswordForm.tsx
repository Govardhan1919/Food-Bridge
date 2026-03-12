import { useState } from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ChangePasswordForm() {
    const { toast } = useToast();
    const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
    const [done, setDone] = useState(false);

    const mutation = useMutation({
        mutationFn: () =>
            api.patch<{ message: string }>('/auth/change-password', {
                current_password: form.current_password,
                new_password: form.new_password,
            }),
        onSuccess: (res) => {
            toast({ title: 'Password changed ✅', description: res.message });
            setForm({ current_password: '', new_password: '', confirm: '' });
            setDone(true);
        },
        onError: (err: Error) =>
            toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.new_password !== form.confirm) {
            toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
        }
        if (form.new_password.length < 6) {
            toast({ title: 'New password must be at least 6 characters', variant: 'destructive' }); return;
        }
        mutation.mutate();
    };

    if (done) {
        return (
            <div className="glass-card rounded-2xl p-6 text-center space-y-2">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium text-foreground">Password changed successfully!</p>
                <button
                    className="text-xs text-primary underline"
                    onClick={() => setDone(false)}
                >
                    Change again
                </button>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">Change Password</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
                {[
                    { id: 'current_password', label: 'Current Password' },
                    { id: 'new_password', label: 'New Password' },
                    { id: 'confirm', label: 'Confirm New Password' },
                ].map(({ id, label }) => (
                    <div key={id} className="space-y-1">
                        <Label htmlFor={`cp-${id}`}>{label}</Label>
                        <Input
                            id={`cp-${id}`}
                            type="password"
                            value={form[id as keyof typeof form]}
                            onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
                            required
                        />
                    </div>
                ))}
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Updating…' : 'Update Password'}
                </Button>
            </form>
        </div>
    );
}
