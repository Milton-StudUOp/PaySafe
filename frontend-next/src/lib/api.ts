import axios from 'axios';
import Cookies from 'js-cookie';

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
    }
    return 'http://localhost:8000/api/v1';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // CRITICAL: Required for cross-origin requests from LAN
});

api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const url = error.config?.url || '';

            // Don't auto-redirect for detail endpoints - let the page handle the error
            const isDetailEndpoint = url.includes('/uuid/') ||
                url.includes('/transactions/') ||
                url.includes('/merchants/') ||
                url.includes('/agents/') ||
                url.includes('/markets/') ||
                url.includes('/pos/') ||
                url.includes('/audit-logs/');

            // IDOR Protection / Not Found / Unauthorized
            // Only redirect for listing pages, not detail views
            if ((error.response.status === 404 || error.response.status === 403) && !isDetailEndpoint) {
                if (typeof window !== 'undefined') {
                    if (!window.location.pathname.startsWith('/not-found')) {
                        window.location.href = '/not-found';
                    }
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
