import dataStore from '../store/dataStore';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const salaryStructureService = {
    // Get all salary structures
    getSalaryStructures: async () => {
        await delay(MOCK_API_DELAY);

        return {
            success: true,
            data: dataStore.getSalaryStructures(),
        };
    },

    // Get single salary structure
    getSalaryStructure: async (id) => {
        await delay(MOCK_API_DELAY);

        const structure = dataStore.getSalaryStructure(id);

        if (structure) {
            return {
                success: true,
                data: structure,
            };
        }

        return {
            success: false,
            message: 'Salary structure not found',
        };
    },

    // Create salary structure
    createSalaryStructure: async (structureData) => {
        await delay(MOCK_API_DELAY);

        // Check for duplicate name
        const existing = dataStore.getSalaryStructures().find(s =>
            s.name.toLowerCase() === structureData.name.toLowerCase()
        );

        if (existing) {
            return {
                success: false,
                message: 'Salary structure with this name already exists',
            };
        }

        const newStructure = dataStore.createSalaryStructure(structureData);

        return {
            success: true,
            message: 'Salary structure created successfully',
            data: newStructure,
        };
    },

    // Update salary structure
    updateSalaryStructure: async (id, updates) => {
        await delay(MOCK_API_DELAY);

        const updated = dataStore.updateSalaryStructure(id, updates);

        if (updated) {
            return {
                success: true,
                message: 'Salary structure updated successfully',
                data: updated,
            };
        }

        return {
            success: false,
            message: 'Salary structure not found',
        };
    },

    // Delete salary structure
    deleteSalaryStructure: async (id) => {
        await delay(MOCK_API_DELAY);

        const result = dataStore.deleteSalaryStructure(id);

        if (result) {
            return {
                success: true,
                message: 'Salary structure deleted successfully',
            };
        }

        return {
            success: false,
            message: 'Salary structure not found',
        };
    },

    // Calculate gross salary from structure
    calculateGross: (structure) => {
        return (
            (structure.basicSalary || 0) +
            (structure.hra || 0) +
            (structure.conveyance || 0) +
            (structure.specialAllowance || 0)
        );
    },
};

export default salaryStructureService;
