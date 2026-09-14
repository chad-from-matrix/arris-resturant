import { STORAGE_KEYS } from '../constants/config';

// Get item from localStorage with JSON parsing
export const getItem = (key) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`Error getting item ${key} from localStorage:`, error);
        return null;
    }
};

// Set item to localStorage with JSON stringification
export const setItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error setting item ${key} to localStorage:`, error);
        return false;
    }
};

// Remove item from localStorage
export const removeItem = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing item ${key} from localStorage:`, error);
        return false;
    }
};

// Clear all localStorage
export const clearStorage = () => {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
};

// Initialize default data if storage is empty
export const initializeStorage = () => {
    // This will be called on first app load to set up mock data
    const hasAuth = getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!hasAuth) {
        // Storage is empty, we can initialize with defaults if needed
        return true;
    }
    return false;
};
