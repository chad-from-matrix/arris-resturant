import dataStore from '../store/dataStore';
import attendanceService from './attendanceService';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const payrollService = {
    // Get payroll history
    getPayrollHistory: async () => {
        await delay(MOCK_API_DELAY);

        return {
            success: true,
            data: dataStore.data.payroll || [],
        };
    },

    // Generate payroll for a month
    generatePayroll: async (month, year, branchId = null) => {
        await delay(MOCK_API_DELAY);

        try {
            const employees = dataStore.getEmployees();
            const filteredEmployees = branchId
                ? employees.filter(emp => emp.site === branchId)
                : employees;

            const payrollRecords = [];
            const payrollId = `payroll-${year}-${String(month).padStart(2, '0')}`;

            for (const emp of filteredEmployees) {
                // Get attendance summary
                const attResponse = await attendanceService.getDailyAttendance(emp.id, month, year);
                const attendance = attResponse.data || [];

                const presentDays = attendance.filter(a => a.status === 'present').length;
                const workingDays = 26; // Standard working days

                // Get salary structure (simplified - using default based on designation)
                const basicSalary = getSalaryByDesignation(emp.designation);
                const hra = Math.round(basicSalary * 0.4);
                const conveyance = basicSalary > 30000 ? 2000 : 1000;
                const specialAllowance = 0;

                const grossSalary = basicSalary + hra + conveyance + specialAllowance;

                // Calculate deductions
                const pf = Math.round(basicSalary * 0.12);
                const esi = grossSalary > 21000 ? 0 : Math.round(grossSalary * 0.0075);
                const professionalTax = 200;
                const tds = grossSalary > 50000 ? Math.round(grossSalary * 0.05) : 0;

                const totalDeductions = pf + esi + professionalTax + tds;

                // Adjust based on attendance
                const salaryMultiplier = presentDays / workingDays;
                const adjustedGross = Math.round(grossSalary * salaryMultiplier);
                const adjustedDeductions = Math.round(totalDeductions * salaryMultiplier);
                const netSalary = adjustedGross - adjustedDeductions;

                payrollRecords.push({
                    id: `${payrollId}-${emp.id}`,
                    payrollId: payrollId,
                    employeeId: emp.id,
                    employeeCode: emp.employeeId,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    designation: emp.designation,
                    month: month,
                    year: year,
                    monthName: getMonthName(month),
                    workingDays: workingDays,
                    daysWorked: presentDays,
                    attendancePercentage: ((presentDays / workingDays) * 100).toFixed(1),

                    basicSalary: Math.round(basicSalary * salaryMultiplier),
                    hra: Math.round(hra * salaryMultiplier),
                    conveyance: Math.round(conveyance * salaryMultiplier),
                    specialAllowance: Math.round(specialAllowance * salaryMultiplier),
                    grossSalary: adjustedGross,

                    pf: Math.round(pf * salaryMultiplier),
                    esi: Math.round(esi * salaryMultiplier),
                    professionalTax: presentDays >= 15 ? professionalTax : 0,
                    tds: Math.round(tds * salaryMultiplier),
                    totalDeductions: adjustedDeductions,

                    netSalary: netSalary,

                    bankAccount: emp.bankAccount,
                    ifscCode: emp.ifscCode,

                    status: 'draft',
                    paymentDate: null,
                    paymentMethod: 'bank_transfer',

                    overtime: 0,
                    bonus: 0,
                    advance: 0,
                });
            }

            // Save payroll run
            const payrollRun = {
                id: payrollId,
                month: month,
                year: year,
                monthName: getMonthName(month),
                totalEmployees: payrollRecords.length,
                totalGross: payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0),
                totalDeductions: payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0),
                totalNet: payrollRecords.reduce((sum, r) => sum + r.netSalary, 0),
                status: 'draft',
                generatedDate: new Date().toISOString().split('T')[0],
                paidDate: null,
                records: payrollRecords,
            };

            // Add to dataStore
            const existingIndex = dataStore.data.payroll.findIndex(p => p.id === payrollId);
            if (existingIndex !== -1) {
                dataStore.data.payroll[existingIndex] = payrollRun;
            } else {
                dataStore.data.payroll.push(payrollRun);
            }

            dataStore.saveToStorage();

            return {
                success: true,
                message: 'Payroll generated successfully',
                data: payrollRun,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to generate payroll',
            };
        }
    },

    // Get payroll details for a specific month
    getPayrollByMonth: async (month, year) => {
        await delay(MOCK_API_DELAY);

        const payrollId = `payroll-${year}-${String(month).padStart(2, '0')}`;
        const payroll = dataStore.data.payroll.find(p => p.id === payrollId);

        if (payroll) {
            return {
                success: true,
                data: payroll,
            };
        }

        return {
            success: false,
            message: 'Payroll not found for this month',
        };
    },

    // Update payroll record (edit payslip)
    updatePayrollRecord: async (payrollId, employeeId, updates) => {
        await delay(MOCK_API_DELAY);

        const payroll = dataStore.data.payroll.find(p => p.id === payrollId);

        if (!payroll) {
            return {
                success: false,
                message: 'Payroll not found',
            };
        }

        const recordIndex = payroll.records.findIndex(r => r.employeeId === employeeId);

        if (recordIndex === -1) {
            return {
                success: false,
                message: 'Employee record not found in payroll',
            };
        }

        // Update the record
        payroll.records[recordIndex] = {
            ...payroll.records[recordIndex],
            ...updates,
        };

        // Recalculate totals
        payroll.totalGross = payroll.records.reduce((sum, r) => sum + r.grossSalary, 0);
        payroll.totalDeductions = payroll.records.reduce((sum, r) => sum + r.totalDeductions, 0);
        payroll.totalNet = payroll.records.reduce((sum, r) => sum + r.netSalary, 0);

        dataStore.saveToStorage();

        return {
            success: true,
            message: 'Payroll record updated successfully',
            data: payroll.records[recordIndex],
        };
    },

    // Approve payroll
    approvePayroll: async (payrollId) => {
        await delay(MOCK_API_DELAY);

        const payroll = dataStore.data.payroll.find(p => p.id === payrollId);

        if (!payroll) {
            return {
                success: false,
                message: 'Payroll not found',
            };
        }

        payroll.status = 'approved';
        payroll.records.forEach(r => r.status = 'approved');

        dataStore.saveToStorage();

        return {
            success: true,
            message: 'Payroll approved successfully',
            data: payroll,
        };
    },

    // Mark as paid
    markAsPaid: async (payrollId, employeeId = null) => {
        await delay(MOCK_API_DELAY);

        const payroll = dataStore.data.payroll.find(p => p.id === payrollId);

        if (!payroll) {
            return {
                success: false,
                message: 'Payroll not found',
            };
        }

        const paymentDate = new Date().toISOString().split('T')[0];

        if (employeeId) {
            // Mark single employee as paid
            const record = payroll.records.find(r => r.employeeId === employeeId);
            if (record) {
                record.status = 'paid';
                record.paymentDate = paymentDate;

                // Log activity
                dataStore.addActivityLog(employeeId, 'salary_paid', `Salary paid for ${getMonthName(payroll.month)} ${payroll.year}`);
            }
        } else {
            // Mark all as paid
            payroll.status = 'paid';
            payroll.paidDate = paymentDate;
            payroll.records.forEach(r => {
                r.status = 'paid';
                r.paymentDate = paymentDate;
                dataStore.addActivityLog(r.employeeId, 'salary_paid', `Salary paid for ${getMonthName(payroll.month)} ${payroll.year}`);
            });
        }

        dataStore.saveToStorage();

        return {
            success: true,
            message: 'Marked as paid successfully',
            data: payroll,
        };
    },
};

const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
};

const getSalaryByDesignation = (designation) => {
    const salaryMap = {
        'Executive Chef': 45000,
        'Sous Chef': 30000,
        'Floor Manager': 30000,
        'General Manager': 70000,
        'Head Cashier': 20000,
        'Grill Chef': 25000,
        'Assistant Manager': 40000,
        'Cashier': 18000,
        'Commis Chef': 16000,
        'Senior Waiter': 18000,
        'Waiter': 15000,
        'Housekeeping Staff': 14000,
        'Cleaning Supervisor': 17000,
        'Kitchen Helper': 12000,
    };

    return salaryMap[designation] || 15000;
};

export default payrollService;
