// Centralized Data Store with localStorage persistence
// This singleton manages all application data and provides CRUD operations

import { mockEmployees } from '../mockData/employees';
import { mockDepartments } from '../mockData/departments';
import { mockSites } from '../mockData/sites';
import { mockHolidays } from '../mockData/holidays';

const STORAGE_KEY = 'arris_hrms_data';

class DataStore {
    constructor() {
        this.data = this.loadFromStorage() || this.getInitialData();
        this.listeners = [];
    }

    getInitialData() {
        return {
            employees: mockEmployees,
            departments: mockDepartments,
            sites: mockSites,
            holidays: mockHolidays,
            attendance: {},
            payroll: [],
            tasks: [],
            salaryStructures: this.getDefaultSalaryStructures(),
            activityLogs: {},
        };
    }

    getDefaultSalaryStructures() {
        return [
            {
                id: 'sal-001',
                name: 'Executive Chef Package',
                basicSalary: 45000,
                hra: 18000,
                conveyance: 2000,
                specialAllowance: 0,
                pf: 12,
                esi: 0,
                professionalTax: 200,
                createdAt: '2020-06-01',
            },
            {
                id: 'sal-002',
                name: 'Manager Package',
                basicSalary: 40000,
                hra: 16000,
                conveyance: 2000,
                specialAllowance: 0,
                pf: 12,
                esi: 0,
                professionalTax: 200,
                createdAt: '2020-06-01',
            },
            {
                id: 'sal-003',
                name: 'Chef Package',
                basicSalary: 28000,
                hra: 11000,
                conveyance: 2000,
                specialAllowance: 0,
                pf: 12,
                esi: 0.75,
                professionalTax: 200,
                createdAt: '2020-06-01',
            },
            {
                id: 'sal-004',
                name: 'Service Staff Package',
                basicSalary: 18000,
                hra: 7000,
                conveyance: 1000,
                specialAllowance: 0,
                pf: 12,
                esi: 0.75,
                professionalTax: 200,
                createdAt: '2020-06-01',
            },
            {
                id: 'sal-005',
                name: 'Entry Level Package',
                basicSalary: 14000,
                hra: 5000,
                conveyance: 800,
                specialAllowance: 0,
                pf: 12,
                esi: 0.75,
                professionalTax: 200,
                createdAt: '2020-06-01',
            },
        ];
    }

    // Load data from localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
        return null;
    }

    // Save data to localStorage
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Subscribe to data changes
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify all listeners of data change
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.data));
    }

    // Get all data
    getData() {
        return this.data;
    }

    // ==================== EMPLOYEES ====================

    getEmployees() {
        return this.data.employees;
    }

    getEmployee(id) {
        return this.data.employees.find(emp => emp.id === id);
    }

    createEmployee(employeeData) {
        const newEmployee = {
            ...employeeData,
            id: `emp-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        this.data.employees.push(newEmployee);
        this.addActivityLog(newEmployee.id, 'employee_created', `Employee profile created`);
        this.saveToStorage();
        return newEmployee;
    }

    updateEmployee(id, updates) {
        const index = this.data.employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            this.data.employees[index] = { ...this.data.employees[index], ...updates };
            this.addActivityLog(id, 'employee_updated', `Profile updated`);
            this.saveToStorage();
            return this.data.employees[index];
        }
        return null;
    }

    deleteEmployee(id) {
        const index = this.data.employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            this.data.employees.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    toggleEmployeeStatus(id) {
        const employee = this.getEmployee(id);
        if (employee) {
            const newStatus = employee.status === 'active' ? 'inactive' : 'active';
            this.updateEmployee(id, { status: newStatus });
            this.addActivityLog(id, 'status_changed', `Status changed to ${newStatus}`);
            return newStatus;
        }
        return null;
    }

    // ==================== DEPARTMENTS ====================

    getDepartments() {
        return this.data.departments;
    }

    getDepartment(id) {
        return this.data.departments.find(dept => dept.id === id);
    }

    createDepartment(departmentData) {
        const newDept = {
            ...departmentData,
            id: `dept-${Date.now()}`,
            employeeCount: 0,
            createdAt: new Date().toISOString(),
        };
        this.data.departments.push(newDept);
        this.saveToStorage();
        return newDept;
    }

    updateDepartment(id, updates) {
        const index = this.data.departments.findIndex(dept => dept.id === id);
        if (index !== -1) {
            this.data.departments[index] = { ...this.data.departments[index], ...updates };
            this.saveToStorage();
            return this.data.departments[index];
        }
        return null;
    }

    deleteDepartment(id) {
        // Check if any employees are assigned
        const hasEmployees = this.data.employees.some(emp => emp.department === this.getDepartment(id)?.name);
        if (hasEmployees) {
            return { success: false, message: 'Cannot delete department with assigned employees' };
        }

        const index = this.data.departments.findIndex(dept => dept.id === id);
        if (index !== -1) {
            this.data.departments.splice(index, 1);
            this.saveToStorage();
            return { success: true };
        }
        return { success: false, message: 'Department not found' };
    }

    // ==================== SITES ====================

    getSites() {
        return this.data.sites;
    }

    getSite(id) {
        return this.data.sites.find(site => site.id === id);
    }

    createSite(siteData) {
        const newSite = {
            ...siteData,
            id: `site-${Date.now()}`,
            employeeCount: 0,
            status: 'active',
            openingDate: new Date().toISOString().split('T')[0],
        };
        this.data.sites.push(newSite);
        this.saveToStorage();
        return newSite;
    }

    updateSite(id, updates) {
        const index = this.data.sites.findIndex(site => site.id === id);
        if (index !== -1) {
            this.data.sites[index] = { ...this.data.sites[index], ...updates };
            this.saveToStorage();
            return this.data.sites[index];
        }
        return null;
    }

    deleteSite(id) {
        // Check if any employees are assigned  
        const hasEmployees = this.data.employees.some(emp => emp.site === this.getSite(id)?.name);
        if (hasEmployees) {
            return { success: false, message: 'Cannot delete site with assigned employees' };
        }

        const index = this.data.sites.findIndex(site => site.id === id);
        if (index !== -1) {
            this.data.sites.splice(index, 1);
            this.saveToStorage();
            return { success: true };
        }
        return { success: false, message: 'Site not found' };
    }

    // ==================== HOLIDAYS ====================

    getHolidays() {
        return this.data.holidays;
    }

    createHoliday(holidayData) {
        const newHoliday = {
            ...holidayData,
            id: `holiday-${Date.now()}`,
        };
        this.data.holidays.push(newHoliday);
        this.saveToStorage();
        return newHoliday;
    }

    updateHoliday(id, updates) {
        const index = this.data.holidays.findIndex(h => h.id === id);
        if (index !== -1) {
            this.data.holidays[index] = { ...this.data.holidays[index], ...updates };
            this.saveToStorage();
            return this.data.holidays[index];
        }
        return null;
    }

    deleteHoliday(id) {
        const index = this.data.holidays.findIndex(h => h.id === id);
        if (index !== -1) {
            this.data.holidays.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // ==================== SALARY STRUCTURES ====================

    getSalaryStructures() {
        return this.data.salaryStructures;
    }

    getSalaryStructure(id) {
        return this.data.salaryStructures.find(s => s.id === id);
    }

    createSalaryStructure(structureData) {
        const newStructure = {
            ...structureData,
            id: `sal-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        this.data.salaryStructures.push(newStructure);
        this.saveToStorage();
        return newStructure;
    }

    updateSalaryStructure(id, updates) {
        const index = this.data.salaryStructures.findIndex(s => s.id === id);
        if (index !== -1) {
            this.data.salaryStructures[index] = { ...this.data.salaryStructures[index], ...updates };
            this.saveToStorage();
            return this.data.salaryStructures[index];
        }
        return null;
    }

    deleteSalaryStructure(id) {
        const index = this.data.salaryStructures.findIndex(s => s.id === id);
        if (index !== -1) {
            this.data.salaryStructures.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // ==================== ATTENDANCE ====================

    getAttendanceForEmployee(employeeId, month, year) {
        // Pad month with leading zero to match the format used when saving (from date.split('-'))
        const paddedMonth = String(month).padStart(2, '0');
        const key = `${employeeId}-${year}-${paddedMonth}`;
        console.log('getAttendanceForEmployee - Looking for key:', key);
        const data = this.data.attendance[key] || [];
        console.log('getAttendanceForEmployee - Found records:', data.length);
        return data;
    }

    markAttendance(employeeId, date, status, notes = '') {
        const [year, month] = date.split('-');
        const key = `${employeeId}-${year}-${month}`;

        if (!this.data.attendance[key]) {
            this.data.attendance[key] = [];
        }

        const existingIndex = this.data.attendance[key].findIndex(a => a.date === date);
        const record = {
            id: `att-${Date.now()}`,
            employeeId,
            date,
            status,
            notes,
            updatedAt: new Date().toISOString(),
        };

        if (existingIndex !== -1) {
            this.data.attendance[key][existingIndex] = record;
        } else {
            this.data.attendance[key].push(record);
        }

        this.addActivityLog(employeeId, 'attendance_marked', `Attendance marked ${status} for ${date}`);
        this.saveToStorage();
        return record;
    }

    // ==================== ACTIVITY LOGS ====================

    addActivityLog(employeeId, type, description) {
        if (!this.data.activityLogs[employeeId]) {
            this.data.activityLogs[employeeId] = [];
        }

        this.data.activityLogs[employeeId].push({
            id: `log-${Date.now()}`,
            type,
            description,
            timestamp: new Date().toISOString(),
        });

        // Keep only last 50 logs per employee
        if (this.data.activityLogs[employeeId].length > 50) {
            this.data.activityLogs[employeeId] = this.data.activityLogs[employeeId].slice(-50);
        }
    }

    getActivityLogs(employeeId) {
        return this.data.activityLogs[employeeId] || [];
    }

    // Reset all data (for testing)
    reset() {
        this.data = this.getInitialData();
        this.saveToStorage();
    }
}

// Create singleton instance
const dataStore = new DataStore();

export default dataStore;
