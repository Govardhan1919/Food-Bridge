import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Wifi, WifiOff, Eye, Package, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Vehicle type → capacity mapping (mirrors server)
const VEHICLE_OPTIONS = [
    { value: 'bike', label: 'Bike', capacity: 10 },
    { value: 'mini_van', label: 'Mini Van', capacity: 50 },
    { value: 'van', label: 'Van', capacity: 100 },
    { value: 'truck', label: 'Truck', capacity: 200 },
] as const;

type VehicleType = typeof VEHICLE_OPTIONS[number]['value'];

interface Rider {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    is_online: boolean;
    vehicle_type: VehicleType;
    vehicle_capacity: number;
    aadhaar_no: string | null;
    vehicle_no: string | null;
    address: string | null;
    driving_licence_no: string | null;
}

interface Ride {
    id: number;
    status: string;
    from_location: string;
    to_location: string;
    created_at: string;
    donation_title: string;
    meal_plates: number;
    expiry: string;
    donor_name: string | null;
}

const emptyForm = {
    name: '', phone: '', email: '', password: '',
    aadhaar_no: '', vehicle_no: '', address: '', driving_licence_no: '',
    vehicle_type: '' as VehicleType | '',
};

const STATUS_COLORS: Record<string, string> = {
    completed: 'text-green-500',
    in_progress: 'text-yellow-500',
    pending: 'text-muted-foreground',
};

function RiderRidesDialog({ rider }: { rider: Rider }) {
    const [open, setOpen] = useState(false);

    const { data: rides = [], isLoading } = useQuery<Ride[]>({
        queryKey: ['rider-rides', rider.id],
        queryFn: () => api.get<Ride[]>(`/riders/${rider.id}/rides`),
        enabled: open,
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    title="View ride history"
                    className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <Eye className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Rides — {rider.name}
                    </DialogTitle>
                </DialogHeader>

                {/* Rider info strip */}
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Vehicle:</span> {VEHICLE_OPTIONS.find(v => v.value === rider.vehicle_type)?.label ?? rider.vehicle_type} · {rider.vehicle_capacity} plates</p>
                    {rider.phone && <p><span className="font-medium text-foreground">Phone:</span> {rider.phone}</p>}
                    {rider.vehicle_no && <p><span className="font-medium text-foreground">Vehicle No.:</span> {rider.vehicle_no}</p>}
                    {rider.driving_licence_no && <p><span className="font-medium text-foreground">Licence:</span> {rider.driving_licence_no}</p>}
                    {rider.address && <p><span className="font-medium text-foreground">Address:</span> {rider.address}</p>}
                </div>

                <div className="overflow-y-auto flex-1 mt-1">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Loading rides…</p>
                    ) : rides.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No rides completed yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {rides.map((r) => (
                                <div key={r.id} className="rounded-xl border border-border px-4 py-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-primary shrink-0" />
                                            <p className="text-sm font-medium text-foreground">{r.donation_title}</p>
                                        </div>
                                        <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[r.status] ?? 'text-muted-foreground'}`}>
                                            {r.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1 pl-6">
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span><span className="font-medium">From:</span> {r.from_location}</span>
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="h-3 w-3 shrink-0 text-primary" />
                                            <span><span className="font-medium">To:</span> {r.to_location}</span>
                                        </p>
                                        <p><span className="font-medium">Plates:</span> {r.meal_plates}</p>
                                        {r.donor_name && <p><span className="font-medium">Donor:</span> {r.donor_name}</p>}
                                        <p className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            {new Date(r.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function RiderManagePanel() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const { data: riders = [] } = useQuery<Rider[]>({
        queryKey: ['riders'],
        queryFn: () => api.get<Rider[]>('/riders'),
    });

    const addMutation = useMutation({
        mutationFn: () => api.post('/riders', { ...form }),
        onSuccess: () => {
            toast({ title: 'Rider added!', description: `${form.name} has been registered.` });
            queryClient.invalidateQueries({ queryKey: ['riders'] });
            setForm(emptyForm);
            setOpen(false);
        },
        onError: (err: Error) =>
            toast({ title: 'Failed to add rider', description: err.message, variant: 'destructive' }),
    });

    const textFields: { id: keyof typeof emptyForm; label: string; type: string; required?: boolean }[] = [
        { id: 'name', label: 'Full Name', type: 'text', required: true },
        { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
        { id: 'email', label: 'Email (optional)', type: 'email' },
        { id: 'aadhaar_no', label: 'Aadhaar Number', type: 'text', required: true },
        { id: 'vehicle_no', label: 'Vehicle Number', type: 'text', required: true },
        { id: 'driving_licence_no', label: 'Driving Licence No.', type: 'text', required: true },
        { id: 'address', label: 'Address', type: 'text', required: true },
        { id: 'password', label: 'Temporary Password', type: 'password', required: true },
    ];

    const selectedVehicle = VEHICLE_OPTIONS.find(v => v.value === form.vehicle_type);
    const canSubmit = form.name && form.phone && form.password && form.vehicle_type &&
        form.aadhaar_no && form.vehicle_no && form.driving_licence_no && form.address;

    return (
        <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">Rider Management</h3>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" /> Add Rider
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Rider</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            {/* Vehicle Type — Select */}
                            <div className="space-y-1">
                                <Label>Vehicle Type <span className="text-destructive text-xs">*</span></Label>
                                <Select
                                    value={form.vehicle_type}
                                    onValueChange={(v) => setForm(f => ({ ...f, vehicle_type: v as VehicleType }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vehicle type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VEHICLE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{opt.label}</span>
                                                    <span className="text-xs text-muted-foreground">· {opt.capacity} plates</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedVehicle && (
                                    <p className="text-xs text-muted-foreground pl-1">
                                        Capacity: <strong>{selectedVehicle.capacity} meal plates</strong>
                                    </p>
                                )}
                            </div>

                            {/* Text fields */}
                            {textFields.map(({ id, label, type, required }) => (
                                <div key={id} className="space-y-1">
                                    <Label htmlFor={id}>
                                        {label}
                                        {required && <span className="text-destructive text-xs"> *</span>}
                                    </Label>
                                    <Input
                                        id={id}
                                        type={type}
                                        value={form[id]}
                                        onChange={(e) => setForm(f => ({ ...f, [id]: e.target.value }))}
                                    />
                                </div>
                            ))}

                            <Button
                                className="w-full"
                                onClick={() => addMutation.mutate()}
                                disabled={addMutation.isPending || !canSubmit}
                            >
                                {addMutation.isPending ? 'Adding…' : 'Add Rider'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {riders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No riders yet. Add your first rider above.</p>
            ) : (
                <div className="space-y-2">
                    {riders.map((r) => {
                        const veh = VEHICLE_OPTIONS.find(v => v.value === r.vehicle_type);
                        return (
                            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {veh ? `${veh.label} · ${veh.capacity} plates` : `${r.vehicle_capacity} plates`}
                                    </p>
                                    {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                                    {r.vehicle_no && <p className="text-xs text-muted-foreground">Vehicle: {r.vehicle_no}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Online / Offline status — display only, no toggle */}
                                    <span className={`flex items-center gap-1 text-xs font-medium ${r.is_online ? 'text-green-500' : 'text-muted-foreground'}`}>
                                        {r.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                        {r.is_online ? 'Online' : 'Offline'}
                                    </span>
                                    {/* View ride history */}
                                    <RiderRidesDialog rider={r} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
