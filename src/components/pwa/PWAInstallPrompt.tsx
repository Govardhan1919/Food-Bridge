import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(() =>
        localStorage.getItem('pwa-install-dismissed') === 'true'
    );
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // Check if iOS Safari (no beforeinstallprompt support)
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
            !(window as unknown as { MSStream: unknown }).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        setIsIOS(ios && !isStandalone);

        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Already installed (standalone) or dismissed
    if (dismissed) return null;

    // Android / Chrome — show native install prompt
    if (installPrompt) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3"
                >
                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                        <Smartphone className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Install Rider App</p>
                        <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Install
                    </button>
                    <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </motion.div>
            </AnimatePresence>
        );
    }

    // iOS Safari — show manual guide
    if (isIOS && !showIOSGuide) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3"
            >
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Install on iPhone</p>
                    <p className="text-xs text-muted-foreground">Tap Share → Add to Home Screen</p>
                </div>
                <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                </button>
            </motion.div>
        );
    }

    return null;
}
