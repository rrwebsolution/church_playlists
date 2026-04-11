import axios from "axios";

// Kuhaon nato ang URL sa .env. Kung undefined, automatic niyang gamiton ang localhost:8000
const apiUrl = import.meta.env.VITE_URL;

const instance = axios.create({
    baseURL: `${apiUrl}/api/`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

export default instance;