import dataStore from '../store/dataStore';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const siteService = {
    // Get all sites
    getSites: async () => {
        await delay(MOCK_API_DELAY);

        return {
            success: true,
            data: dataStore.getSites(),
        };
    },

    // Get single site
    getSite: async (id) => {
        await delay(MOCK_API_DELAY);

        const site = dataStore.getSite(id);

        if (site) {
            return {
                success: true,
                data: site,
            };
        }

        return {
            success: false,
            message: 'Site not found',
        };
    },

    // Create site
    createSite: async (siteData) => {
        await delay(MOCK_API_DELAY);

        // Check for duplicate name
        const existing = dataStore.getSites().find(s =>
            s.name.toLowerCase() === siteData.name.toLowerCase()
        );

        if (existing) {
            return {
                success: false,
                message: 'Site with this name already exists',
            };
        }

        const newSite = dataStore.createSite(siteData);

        return {
            success: true,
            message: 'Site created successfully',
            data: newSite,
        };
    },

    // Update site
    updateSite: async (id, updates) => {
        await delay(MOCK_API_DELAY);

        // Check for duplicate name if name is being updated
        if (updates.name) {
            const existing = dataStore.getSites().find(s =>
                s.id !== id && s.name.toLowerCase() === updates.name.toLowerCase()
            );

            if (existing) {
                return {
                    success: false,
                    message: 'Site with this name already exists',
                };
            }
        }

        const updated = dataStore.updateSite(id, updates);

        if (updated) {
            return {
                success: true,
                message: 'Site updated successfully',
                data: updated,
            };
        }

        return {
            success: false,
            message: 'Site not found',
        };
    },

    // Delete site
    deleteSite: async (id) => {
        await delay(MOCK_API_DELAY);

        const result = dataStore.deleteSite(id);

        if (result.success) {
            return {
                success: true,
                message: 'Site deleted successfully',
            };
        }

        return {
            success: false,
            message: result.message,
        };
    },
};

export default siteService;
