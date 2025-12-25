"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

import { User } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Initialize auth state from storage with Timeout Check
        const initializeAuth = () => {
            const token = Cookies.get('token');
            const userData = localStorage.getItem('user');
            const lastActivity = localStorage.getItem('last_activity');
            const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

            // 1. Check Timeout on Load (e.g. Browser Closed & Reopened)
            if (lastActivity && (Date.now() - parseInt(lastActivity) > TIMEOUT_MS)) {
                console.warn("[Auth] Session expired while closed. Clearing data.");
                Cookies.remove('token');
                Cookies.remove('user_role');
                localStorage.removeItem('user');
                localStorage.removeItem('last_activity');
                setUser(null);
                setIsLoading(false);
                if (window.location.pathname !== '/login') {
                    router.push('/login');
                }
                return;
            }

            // 2. Restore Session if Valid
            if (token && userData) {
                // Update activity on fresh load to keep session alive if within window
                localStorage.setItem('last_activity', Date.now().toString());
                setUser(JSON.parse(userData));
            }
            setIsLoading(false);
        };
        initializeAuth();
    }, []);

    const login = (token: string, userData: User) => {
        Cookies.set('token', token, { expires: 1 }); // 1 day
        Cookies.set('user_role', userData.role, { expires: 1 });
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        if (userData.role === 'MERCHANT' || userData.role === 'COMERCIANTE') {
            router.push('/merchant/dashboard');
        } else {
            router.push('/dashboard');
        }
    };

    const logout = () => {
        Cookies.remove('token');
        Cookies.remove('user_role');
        localStorage.removeItem('user');
        setUser(null);

        // Unified Logout - Always go to main login
        router.push('/login');
    };

    // Auto-logout Logic
    useEffect(() => {
        if (!user) return;

        const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const CHECK_INTERVAL = 10000; // 10s

        const updateActivity = () => {
            if (user) localStorage.setItem('last_activity', Date.now().toString());
        };

        const checkInactivity = () => {
            const lastActivity = localStorage.getItem('last_activity');
            if (lastActivity) {
                const now = Date.now();
                if (now - parseInt(lastActivity) > TIMEOUT_MS) {
                    console.warn("User inactive for 5 minutes. Auto-logging out.");
                    logout();
                }
            } else {
                updateActivity();
            }
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity));

        const intervalId = setInterval(checkInactivity, CHECK_INTERVAL);
        updateActivity();

        return () => {
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(intervalId);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
