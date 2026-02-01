import dataStore from '../store/dataStore';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const holidayService = {
    // Get all holidays
    getHolidays: async () => {
        await delay(MOCK_API_DELAY);

        return {
            success: true,
            data: dataStore.getHolidays(),
        };
    },

    // Create holiday
    createHoliday: async (holidayData) => {
        await delay(MOCK_API_DELAY);

        const newHoliday = dataStore.createHoliday(holidayData);

        return {
            success: true,
            message: 'Holiday created successfully',
            data: newHoliday,
        };
    },

    // Update holiday
    updateHoliday: async (id, updates) => {
        await delay(MOCK_API_DELAY);

        const updated = dataStore.updateHoliday(id, updates);

        if (updated) {
            return {
                success: true,
                message: 'Holiday updated successfully',
                data: updated,
            };
        }

        return {
            success: false,
            message: 'Holiday not found',
        };
    },

    // Delete holiday
    deleteHoliday: async (id) => {
        await delay(MOCK_API_DELAY);

        const result = dataStore.deleteHoliday(id);

        if (result) {
            return {
                success: true,
                message: 'Holiday deleted successfully',
            };
        }

        return {
            success: false,
            message: 'Holiday not found',
        };
    },
};

export default holidayService;
