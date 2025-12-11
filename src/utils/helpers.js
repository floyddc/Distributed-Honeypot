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
        console.error('Primary geo API (ipapi.co) failed, trying fallback:', error);
        // Fallback 
        try {
            const response = await axios.get(`http://ip-api.com/json/${ip}`);
            return {
                country: response.data.country || 'unknown',
                city: response.data.city || 'unknown',
                lat: response.data.lat || null,
                lon: response.data.lon || null
            };
        } catch (fallbackError) {
            console.error('Fallback geo API (ip-api.com) also failed:', fallbackError);
            return {
                country: 'unknown',
                city: 'unknown',
                lat: null,
                lon: null
            };
        }
    }
}