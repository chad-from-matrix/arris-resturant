// Mock Payroll Data for ARRIS RESTAURANT HRMS

// Salary components configuration
const salaryComponents = {
    'Executive Chef': { basic: 45000, hra: 18000, conveyance: 2000, special: 0 },
    'Sous Chef': { basic: 30000, hra: 12000, conveyance: 2000, special: 0 },
    'Floor Manager': { basic: 30000, hra: 12000, conveyance: 2000, special: 0 },
    'General Manager': { basic: 70000, hra: 28000, conveyance: 2000, special: 0 },
    'Head Cashier': { basic: 20000, hra: 8000, conveyance: 1500, special: 0 },
    'Grill Chef': { basic: 25000, hra: 10000, conveyance: 2000, special: 0 },
    'Assistant Manager': { basic: 40000, hra: 16000, conveyance: 2000, special: 0 },
    'Cashier': { basic: 18000, hra: 7000, conveyance: 1000, special: 0 },
    'Commis Chef': { basic: 16000, hra: 6000, conveyance: 1000, special: 0 },
    'Senior Waiter': { basic: 18000, hra: 7000, conveyance: 1000, special: 0 },
    'Waiter': { basic: 15000, hra: 5000, conveyance: 800, special: 0 },
    'Housekeeping Staff': { basic: 14000, hra: 5000, conveyance: 800, special: 0 },
    'Cleaning Supervisor': { basic: 17000, hra: 6000, conveyance: 1000, special: 0 },
    'Kitchen Helper': { basic: 12000, hra: 4000, conveyance: 800, special: 0 },
};

const employees = [
    { id: 'emp-001', employeeId: 'ARR001', name: 'Rajesh Kumar', designation: 'Executive Chef', bankAccount: '12345678901234', ifsc: 'HDFC0001234' },
    { id: 'emp-002', employeeId: 'ARR002', name: 'Priya Sharma', designation: 'Floor Manager', bankAccount: '23456789012345', ifsc: 'ICIC0002345' },
    { id: 'emp-003', employeeId: 'ARR003', name: 'Amit Patel', designation: 'General Manager', bankAccount: '34567890123456', ifsc: 'SBIN0003456' },
    { id: 'emp-004', employeeId: 'ARR004', name: 'Sneha Reddy', designation: 'Head Cashier', bankAccount: '45678901234567', ifsc: 'UTIB0004567' },
    { id: 'emp-005', employeeId: 'ARR005', name: 'Arjun Kapoor', designation: 'Sous Chef', bankAccount: '78901234567890', ifsc: 'SBIN0007890' },
    { id: 'emp-006', employeeId: 'ARR006', name: 'Pooja Nair', designation: 'Senior Waiter', bankAccount: '89012345678901', ifsc: 'UTIB0008901' },
    { id: 'emp-007', employeeId: 'ARR007', name: 'Rahul Verma', designation: 'Grill Chef', bankAccount: '90123456789012', ifsc: 'HDFC0009012' },
    { id: 'emp-008', employeeId: 'ARR008', name: 'Neha Kapoor', designation: 'Floor Manager', bankAccount: '01234567890123', ifsc: 'ICIC0000123' },
    { id: 'emp-009', employeeId: 'ARR009', name: 'Karthik Nair', designation: 'Assistant Manager', bankAccount: '12345098765432', ifsc: 'SBIN0001234' },
    { id: 'emp-010', employeeId: 'ARR010', name: 'Divya Iyer', designation: 'Cashier', bankAccount: '23450987654321', ifsc: 'UTIB0002345' },
    { id: 'emp-011', employeeId: 'ARR011', name: 'Rohan Gupta', designation: 'Commis Chef', bankAccount: '34560987654321', ifsc: 'HDFC0003456' },
    { id: 'emp-012', employeeId: 'ARR012', name: 'Sonal Desai', designation: 'Waiter', bankAccount: '45670987654321', ifsc: 'ICIC0004567' },
    { id: 'emp-013', employeeId: 'ARR013', name: 'Aditya Khanna', designation: 'Waiter', bankAccount: '56780987654321', ifsc: 'SBIN0005678' },
    { id: 'emp-014', employeeId: 'ARR014', name: 'Kavita Jain', designation: 'Housekeeping Staff', bankAccount: '67890987654321', ifsc: 'UTIB0006789' },
    { id: 'emp-015', employeeId: 'ARR015', name: 'Manish Shah', designation: 'Cleaning Supervisor', bankAccount: '78900987654321', ifsc: 'HDFC0007890' },
    { id: 'emp-016', employeeId: 'ARR016', name: 'Ritu Agarwal', designation: 'Kitchen Helper', bankAccount: '89010987654321', ifsc: 'ICIC0008901' },
    { id: 'emp-017', employeeId: 'ARR017', name: 'Nikhil Choudhary', designation: 'Grill Chef', bankAccount: '90120987654321', ifsc: 'SBIN0009012' },
];

// Generate payroll for a specific month
const generatePayrollForMonth = (month, year) => {
    const payrollRecords = [];
    const payrollId = `payroll-${year}-${String(month).padStart(2, '0')}`;

    employees.forEach((emp) => {
        const components = salaryComponents[emp.designation] || { basic: 15000, hra: 5000, conveyance: 1000, special: 0 };

        const basicSalary = components.basic;
        const hra = components.hra;
        const conveyance = components.conveyance;
        const specialAllowance = components.special;

        const grossSalary = basicSalary + hra + conveyance + specialAllowance;

        // Deductions
        const pf = Math.round(basicSalary * 0.12); // 12% PF
        const esi = grossSalary > 21000 ? 0 : Math.round(grossSalary * 0.0075); // 0.75% ESI if gross < 21000
        const professionalTax = 200;
        const tds = grossSalary > 50000 ? Math.round(grossSalary * 0.05) : 0; // 5% TDS if gross > 50000

        const totalDeductions = pf + esi + professionalTax + tds;
        const netSalary = grossSalary - totalDeductions;

        // Random number of days worked (assume 26 working days, random attendance 20-26)
        const workingDays = 26;
        const daysWorked = Math.floor(Math.random() * 6) + 21; // 21-26 days
        const attendancePercentage = ((daysWorked / workingDays) * 100).toFixed(1);

        // Adjust salary based on attendance if less than full month
        const salaryMultiplier = daysWorked / workingDays;
        const adjustedGross = Math.round(grossSalary * salaryMultiplier);
        const adjustedDeductions = Math.round(totalDeductions * salaryMultiplier);
        const adjustedNet = adjustedGross - adjustedDeductions;

        payrollRecords.push({
            id: `${payrollId}-${emp.id}`,
            payrollId: payrollId,
            employeeId: emp.id,
            employeeCode: emp.employeeId,
            employeeName: emp.name,
            designation: emp.designation,
            month: month,
            year: year,
            monthName: getMonthName(month),
            workingDays: workingDays,
            daysWorked: daysWorked,
            attendancePercentage: attendancePercentage,

            // Earnings
            basicSalary: Math.round(basicSalary * salaryMultiplier),
            hra: Math.round(hra * salaryMultiplier),
            conveyance: Math.round(conveyance * salaryMultiplier),
            specialAllowance: Math.round(specialAllowance * salaryMultiplier),
            grossSalary: adjustedGross,

            // Deductions
            pf: Math.round(pf * salaryMultiplier),
            esi: Math.round(esi * salaryMultiplier),
            professionalTax: daysWorked >= 15 ? professionalTax : 0,
            tds: Math.round(tds * salaryMultiplier),
            totalDeductions: adjustedDeductions,

            // Net
            netSalary: adjustedNet,

            // Bank details
            bankAccount: emp.bankAccount,
            ifscCode: emp.ifsc,

            // Status
            status: 'paid',
            paymentDate: `${year}-${String(month).padStart(2, '0')}-${month === 1 ? '05' : '28'}`,
            paymentMethod: 'bank_transfer',
        });
    });

    return payrollRecords;
};

const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
};

// Generate payroll history for last 6 months
const generatePayrollHistory = () => {
    const history = [];

    // December 2025
    history.push({
        id: 'payroll-2025-12',
        month: 12,
        year: 2025,
        monthName: 'December 2025',
        totalEmployees: 17,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        status: 'paid',
        generatedDate: '2025-12-25',
        paidDate: '2025-12-28',
    });

    // November 2025
    history.push({
        id: 'payroll-2025-11',
        month: 11,
        year: 2025,
        monthName: 'November 2025',
        totalEmployees: 17,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        status: 'paid',
        generatedDate: '2025-11-25',
        paidDate: '2025-11-28',
    });

    // October 2025
    history.push({
        id: 'payroll-2025-10',
        month: 10,
        year: 2025,
        monthName: 'October 2025',
        totalEmployees: 16,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        status: 'paid',
        generatedDate: '2025-10-25',
        paidDate: '2025-10-28',
    });

    // January 2026 (current/pending)
    history.push({
        id: 'payroll-2026-01',
        month: 1,
        year: 2026,
        monthName: 'January 2026',
        totalEmployees: 17,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        status: 'pending',
        generatedDate: null,
        paidDate: null,
    });

    // Calculate totals for each payroll run
    history.forEach(payroll => {
        const records = generatePayrollForMonth(payroll.month, payroll.year);
        payroll.totalGross = records.reduce((sum, rec) => sum + rec.grossSalary, 0);
        payroll.totalDeductions = records.reduce((sum, rec) => sum + rec.totalDeductions, 0);
        payroll.totalNet = records.reduce((sum, rec) => sum + rec.netSalary, 0);
    });

    return history;
};

export const mockPayrollHistory = generatePayrollHistory();

export const mockPayrollRecords = {
    generateForMonth: (month, year) => generatePayrollForMonth(month, year),
};

export default mockPayrollHistory;
