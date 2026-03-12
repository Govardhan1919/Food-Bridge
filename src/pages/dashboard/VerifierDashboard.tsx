import { motion } from "framer-motion";
import { Shield, CheckCircle } from "lucide-react";
import VerificationQueue from "@/components/dashboard/VerificationQueue";

const VerifierDashboard = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Verifier Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Manage donor verification calls</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg font-semibold text-foreground">Donor Verification Queue</h2>
                </div>
                <div className="glass-card rounded-2xl p-4 mb-4 border border-primary/20 bg-primary/5">
                    <p className="text-sm text-foreground font-medium mb-1">How verification works:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>New donors must complete a video verification call for their first 5 donations</li>
                        <li>Click "Mark Video Call Complete" once you've spoken with the donor</li>
                        <li>After 5 verified donations, their future donations go live instantly</li>
                    </ul>
                </div>
                <VerificationQueue />
            </div>
        </div>
    );
};

export default VerifierDashboard;
