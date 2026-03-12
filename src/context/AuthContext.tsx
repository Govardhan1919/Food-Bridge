import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

export interface AuthUser {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: 'donor' | 'ngo' | 'rider' | 'admin';
    verified_badge: boolean;
    donation_count: number;
    is_online: boolean;
    vehicle_type: string | null;
    vehicle_capacity: number | null;
    ngo_id: number | null;
    latitude: string | null;
    longitude: string | null;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (credential: string, password: string, byPhone?: boolean) => Promise<AuthUser>;
    register: (name: string, email: string, password: string, role: string, extras?: Record<string, unknown>) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AUTH_TOKEN_KEY = 'fb_token';
const AUTH_USER_KEY = 'fb_user';

export function getStoredUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function setAuth(token: string, user: AuthUser) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(getStoredUser());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { setUser(getStoredUser()); }, []);

    const login = async (credential: string, password: string, byPhone = false): Promise<AuthUser> => {
        setIsLoading(true);
        try {
            const body = byPhone ? { phone: credential, password } : { email: credential, password };
            const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', body);
            setAuth(res.token, res.user);
            setUser(res.user);
            return res.user;
        } finally { setIsLoading(false); }
    };

    const register = async (name: string, email: string, password: string, role: string, extras: Record<string, unknown> = {}): Promise<void> => {
        setIsLoading(true);
        try {
            const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', { name, email, password, role, ...extras });
            setAuth(res.token, res.user);
            setUser(res.user);
        } finally { setIsLoading(false); }
    };

    const refreshUser = async () => {
        try {
            const fresh = await api.get<AuthUser>('/auth/me');
            // Merge with stored token  
            const token = localStorage.getItem(AUTH_TOKEN_KEY) || '';
            setAuth(token, fresh);
            setUser(fresh);
        } catch { /* ignore */ }
    };

    const logout = () => {
        clearAuth();
        disconnectSocket();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
