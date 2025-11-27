// for export compatibility with ESModules (Vue+Node) 

import axios from 'axios';

export async function getGeoData(ip) {
    try {
        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        return {
            country: response.data.country_name || 'unknown',
            city: response.data.city || 'unknown',
            lat: response.data.latitude || null,
            lon: response.data.longitude || null
        };
    } catch (error) {
        console.error('Error fetching geo data:', error);
        return {
            country: 'unknown',
            city: 'unknown',
            lat: null,
            lon: null
        };
    }
}

export function calculateSeverity(username, password) {
    if (username === 'admin' && password === 'admin123') {
        return 'high';
    }
    if (username === 'root') {
        return 'medium';
    }
    return 'low';
}

export async function getPublicIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json'); // import 'node-fetch' not needed (natively supported in browser)
        return response.data.ip;
    } catch (error) {
        console.error('Error fetching public IP:', error);
        return 'unknown';
    }
}