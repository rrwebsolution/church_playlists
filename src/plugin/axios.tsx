import axios from "axios";

// Kuhaon nato ang URL sa .env.
const isDev = import.meta.env.DEV;
const apiUrl = import.meta.env.VITE_URL || 'https://jamctagoloan-backend-ynnw2j0s.on-forge.com';

// Maghimo tag "Map" para i-track ang mga nagdagan nga requests
const pendingRequests = new Map();

// Helper function para maghimo og unique key (ex: "get:/api/playlists")
const generateRequestKey = (config:any) => {
    return `${config.method}:${config.url}`;
};

const instance = axios.create({
    baseURL: isDev ? '/backend-api/' : `${apiUrl}/api/`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

// REQUEST INTERCEPTOR: Diri nato pugngan ang duplicate
instance.interceptors.request.use(
    (config) => {
        const requestKey = generateRequestKey(config);

        // KINI ANG GIDUGANG:
        // Ayaw i-cancel kung ang URL kay para sa obs update
        const isObsUpdate = config.url?.includes('obs/update') || config.url?.includes('obs-state');

        if (pendingRequests.has(requestKey) && !isObsUpdate) {
            const controller = pendingRequests.get(requestKey);
            controller.abort("Duplicate request cancelled automatically.");
        }

        if (!isObsUpdate) {
          const controller = new AbortController();
          config.signal = controller.signal;
          pendingRequests.set(requestKey, controller);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: Diri nato limpyohan ang na track nga request kung nahuman na
instance.interceptors.response.use(
    (response) => {
        const requestKey = generateRequestKey(response.config);
        pendingRequests.delete(requestKey); // Tangtangon sa listahan kay success na
        return response;
    },
    (error) => {
        // Kung na-cancel nato ang request, ayaw ipakita nga error sa console/UI
        if (axios.isCancel(error)) {
            console.log('Request cancelled:', error.message);
        } else if (error.config) {
            // Kung tinuod nga error, tangtangon gihapon sa listahan
            const requestKey = generateRequestKey(error.config);
            pendingRequests.delete(requestKey);
        }
        return Promise.reject(error);
    }
);

export default instance;
