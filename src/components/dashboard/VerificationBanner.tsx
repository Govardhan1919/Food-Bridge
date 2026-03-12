import { ShieldCheck, Clock, AlertCircle } from 'lucide-react';

interface Props {
    donationCount: number;
    verifiedBadge: boolean;
    hasPendingVerification: boolean;
}

export default function VerificationBanner({ donationCount, verifiedBadge, hasPendingVerification }: Props) {
    if (verifiedBadge) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-3">
                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">Verified Donor 🏅</p>
                    <p className="text-xs text-muted-foreground">Your donations go directly to nearby NGOs without extra verification.</p>
                </div>
            </div>
        );
    }

    if (hasPendingVerification) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3">
                <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Verification Pending</p>
                    <p className="text-xs text-muted-foreground">
                        An admin will call you to verify your donation ({donationCount}/5 verified).
                        Donations become visible to NGOs after each call.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-3">
            <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Verification Required ({donationCount}/5)</p>
                <p className="text-xs text-muted-foreground">
                    Your first 5 donations require a quick video verification call with an admin.
                    After 5 verified donations, you'll receive the Verified Donor badge.
                </p>
            </div>
        </div>
    );
}
