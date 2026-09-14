import dataStore from '../store/dataStore';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const departmentService = {
    // Get all departments
    getDepartments: async () => {
        await delay(MOCK_API_DELAY);

        return {
            success: true,
            data: dataStore.getDepartments(),
        };
    },

    // Get single department
    getDepartment: async (id) => {
        await delay(MOCK_API_DELAY);

        const department = dataStore.getDepartment(id);

        if (department) {
            return {
                success: true,
                data: department,
            };
        }

        return {
            success: false,
            message: 'Department not found',
        };
    },

    // Create department
    createDepartment: async (departmentData) => {
        await delay(MOCK_API_DELAY);

        // Check for duplicate name
        const existing = dataStore.getDepartments().find(d =>
            d.name.toLowerCase() === departmentData.name.toLowerCase()
        );

        if (existing) {
            return {
                success: false,
                message: 'Department with this name already exists',
            };
        }

        const newDept = dataStore.createDepartment(departmentData);

        return {
            success: true,
            message: 'Department created successfully',
            data: newDept,
        };
    },

    // Update department
    updateDepartment: async (id, updates) => {
        await delay(MOCK_API_DELAY);

        // Check for duplicate name if name is being updated
        if (updates.name) {
            const existing = dataStore.getDepartments().find(d =>
                d.id !== id && d.name.toLowerCase() === updates.name.toLowerCase()
            );

            if (existing) {
                return {
                    success: false,
                    message: 'Department with this name already exists',
                };
            }
        }

        const updated = dataStore.updateDepartment(id, updates);

        if (updated) {
            return {
                success: true,
                message: 'Department updated successfully',
                data: updated,
            };
        }

        return {
            success: false,
            message: 'Department not found',
        };
    },

    // Delete department
    deleteDepartment: async (id) => {
        await delay(MOCK_API_DELAY);

        const result = dataStore.deleteDepartment(id);

        if (result.success) {
            return {
                success: true,
                message: 'Department deleted successfully',
            };
        }

        return {
            success: false,
            message: result.message,
        };
    },
};

export default departmentService;
