// Kept for backward compatibility — AuthUser is now primarily in AuthContext.tsx
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

export const setAuth = (token: string, user: AuthUser) => {
    localStorage.setItem('fb_token', token);
    localStorage.setItem('fb_user', JSON.stringify(user));
};

export const getToken = (): string | null => localStorage.getItem('fb_token');

export const getUser = (): AuthUser | null => {
    const raw = localStorage.getItem('fb_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
};

export const clearAuth = () => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_user');
};

export const isAuthenticated = (): boolean => !!getToken();
