import dataStore from '../store/dataStore';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const employeeService = {
    // Get all employees with optional filters
    getEmployees: async (filters = {}) => {
        await delay(MOCK_API_DELAY);

        let employees = dataStore.getEmployees();

        // Apply filters
        if (filters.department) {
            employees = employees.filter(emp => emp.department === filters.department);
        }
        if (filters.site) {
            employees = employees.filter(emp => emp.site === filters.site);
        }
        if (filters.status) {
            employees = employees.filter(emp => emp.status === filters.status);
        }
        if (filters.search) {
            const query = filters.search.toLowerCase();
            employees = employees.filter(emp =>
                emp.firstName?.toLowerCase().includes(query) ||
                emp.lastName?.toLowerCase().includes(query) ||
                emp.employeeId?.toLowerCase().includes(query) ||
                emp.email?.toLowerCase().includes(query)
            );
        }

        return {
            success: true,
            data: employees,
        };
    },

    // Get single employee by ID
    getEmployee: async (id) => {
        await delay(MOCK_API_DELAY);

        const employee = dataStore.getEmployee(id);

        if (employee) {
            return {
                success: true,
                data: employee,
            };
        }

        return {
            success: false,
            message: 'Employee not found',
        };
    },

    // Create new employee
    createEmployee: async (employeeData) => {
        await delay(MOCK_API_DELAY);

        try {
            const newEmployee = dataStore.createEmployee(employeeData);
            return {
                success: true,
                message: 'Employee created successfully',
                data: newEmployee,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to create employee',
            };
        }
    },

    // Update existing employee
    updateEmployee: async (id, updates) => {
        await delay(MOCK_API_DELAY);

        const updated = dataStore.updateEmployee(id, updates);

        if (updated) {
            return {
                success: true,
                message: 'Employee updated successfully',
                data: updated,
            };
        }

        return {
            success: false,
            message: 'Employee not found',
        };
    },

    // Delete employee
    deleteEmployee: async (id) => {
        await delay(MOCK_API_DELAY);

        const result = dataStore.deleteEmployee(id);

        if (result) {
            return {
                success: true,
                message: 'Employee deleted successfully',
            };
        }

        return {
            success: false,
            message: 'Employee not found',
        };
    },

    // Toggle employee active status
    toggleEmployeeStatus: async (id) => {
        await delay(MOCK_API_DELAY);

        const newStatus = dataStore.toggleEmployeeStatus(id);

        if (newStatus) {
            return {
                success: true,
                message: `Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
                data: { status: newStatus },
            };
        }

        return {
            success: false,
            message: 'Employee not found',
        };
    },

    // Get activity logs for employee
    getActivityLogs: async (employeeId) => {
        await delay(MOCK_API_DELAY);

        const logs = dataStore.getActivityLogs(employeeId);

        return {
            success: true,
            data: logs,
        };
    },
};

export default employeeService;
