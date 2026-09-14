// Application Configuration
export const APP_CONFIG = {
    name: 'ARRIS RESTAURANT HRMS',
    version: '1.0.0',
    api: {
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
        timeout: 10000,
    },
};

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'arris_auth_token',
    USER_DATA: 'arris_user_data',
    EMPLOYEES: 'arris_employees',
    DEPARTMENTS: 'arris_departments',
    SITES: 'arris_sites',
    HOLIDAYS: 'arris_holidays',
    ATTENDANCE: 'arris_attendance',
    PAYROLL: 'arris_payroll',
    STICKY_NOTES: 'arris_sticky_notes',
};

// Employment Types
export const EMPLOYMENT_TYPES = [
    { value: 'full-time', label: 'Full-time', color: 'primary' },
    { value: 'part-time', label: 'Part-time', color: 'warning' },
    { value: 'intern', label: 'Intern', color: 'info' },
    { value: 'contract', label: 'Contract', color: 'secondary' },
    { value: 'remote', label: 'Remote', color: 'success' },
    { value: 'hybrid', label: 'Hybrid', color: 'purple' },
];

// Employee Status
export const EMPLOYEE_STATUS = [
    { value: 'active', label: 'Active', color: 'success' },
    { value: 'suspended', label: 'Suspended', color: 'warning' },
    { value: 'resigned', label: 'Resigned', color: 'danger' },
    { value: 'leave', label: 'Leave', color: 'info' },
    { value: 'terminated', label: 'Terminated', color: 'danger' },
];

// Gender Options
export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

// Marital Status
export const MARITAL_STATUS = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
];

// Salary Components
export const SALARY_COMPONENTS = {
    BASIC: 0.40,        // 40% of CTC
    HRA: 0.20,          // 20% of CTC
    MEDICAL: 0.10,      // 10% of CTC
    CONVEYANCE: 0.05,   // 5% of CTC
    SPECIAL: 0.25,      // 25% of CTC
};

// Deductions
export const DEDUCTIONS = {
    PF: 0.12,           // 12% of Basic
    PT: 200,            // Professional Tax (monthly)
    TDS: 0,             // Tax Deducted at Source (calculated based on income)
};

// Date Formats
export const DATE_FORMATS = {
    DISPLAY: 'dd MMM yyyy',
    INPUT: 'yyyy-MM-dd',
    FULL: 'dd MMMM yyyy, hh:mm a',
    SHORT: 'dd/MM/yyyy',
    MONTH_YEAR: 'MMMM yyyy',
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// File Upload
export const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
};

// Mock API Delay (milliseconds)
export const MOCK_API_DELAY = 500;

// Toast Configuration
export const TOAST_CONFIG = {
    position: 'top-right',
    duration: 3000,
    style: {
        borderRadius: '8px',
        fontSize: '14px',
    },
};
