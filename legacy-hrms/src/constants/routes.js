// Route Constants
export const ROUTES = {
    // Auth Routes
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    OTP_VERIFICATION: '/otp-verification',
    RESET_PASSWORD: '/reset-password',

    // Dashboard Routes
    DASHBOARD: '/dashboard',

    // Employee Routes
    EMPLOYEES: '/employees',
    EMPLOYEE_DETAIL: '/employees/:id',
    EMPLOYEE_ADD: '/employees/add',
    EMPLOYEE_EDIT: '/employees/:id/edit',

    // HR Routes
    LEAVES: '/leaves',
    MEETINGS: '/meetings',

    // Attendance Routes
    ATTENDANCE: '/attendance',

    // Payroll Routes
    SALARY_STRUCTURE: '/payroll/salary-structure',
    PAYROLL_GENERATION: '/payroll/generation',
    PAYROLL_HISTORY: '/payroll/history',
    PAYSLIP: '/payroll/payslip/:id',

    // Organization Routes
    SITES: '/organization/sites',

    // Utilities Routes
    STICKY_NOTES: '/utilities/sticky-notes',
    SALARY_CALCULATOR: '/utilities/salary-calculator',

    // Settings
    SETTINGS: '/settings',
    PROFILE: '/profile',
    HELP: '/help',
    NOTIFICATIONS: '/notifications',
};

// Helper function to generate route with params
export const generateRoute = (route, params) => {
    let path = route;
    Object.keys(params).forEach(key => {
        path = path.replace(`:${key}`, params[key]);
    });
    return path;
};
