import { X } from "lucide-react";

interface VideoCallModalProps {
    open: boolean;
    onClose: () => void;
    roomId: string;
    userName: string;
    role: "donor" | "verifier";
    children?: React.ReactNode;
}

const VideoCallModal = ({
    open,
    onClose,
    roomId,
    userName,
    children,
}: VideoCallModalProps) => {
    if (!open) return null;

    // Jitsi Meet URL with some UI configs hidden for a cleaner look
    const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(
        roomId
    )}#userInfo.displayName="${encodeURIComponent(
        userName
    )}"&config.prejoinPageEnabled=false&config.disableDeepLinking=true`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative z-10 w-screen h-screen bg-background overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                    <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Live Verification Call
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Main Video Area */}
                    <div className="flex-1 bg-black relative">
                        <iframe
                            src={jitsiUrl}
                            allow="camera; microphone; fullscreen; display-capture"
                            className="w-full h-full border-0"
                        />
                    </div>

                    {/* Optional Sidebar (e.g., Checklist for Verifier) */}
                    {children && (
                        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card/50 overflow-y-auto">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoCallModal;
