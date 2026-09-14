import dataStore from '../store/dataStore';
import { MOCK_API_DELAY } from '../constants/config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getMonthName = (month) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
};

const attendanceService = {
    // Get monthly attendance summary for all employees
    getMonthlyAttendance: async (month = 1, year = 2026) => {
        await delay(MOCK_API_DELAY);

        const employees = dataStore.getEmployees();
        const summaries = [];

        // Calculate total working days in month (excluding Sundays)
        const daysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            if (new Date(year, month - 1, d).getDay() !== 0) workingDays++;
        }

        employees.forEach(emp => {
            const attendance = dataStore.getAttendanceForEmployee(emp.id, month, year);

            // Count each status
            const present = attendance.filter(a => a.status === 'present').length;
            const absent = attendance.filter(a => a.status === 'absent').length;
            const leave = attendance.filter(a => a.status === 'leave').length;
            const halfDay = attendance.filter(a => a.status === 'half-day').length;
            const totalMarked = attendance.length;

            // Payable calculation
            const payableDays = present + leave + (halfDay * 0.5);
            const percentage = workingDays > 0 ? ((payableDays / workingDays) * 100).toFixed(1) : 0;

            summaries.push({
                id: `att-${emp.id}-${year}-${month}`,
                employeeId: emp.id,
                employeeCode: emp.employeeId,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                month: getMonthName(month),
                year: year,
                totalDays: totalMarked,
                presentDays: present,
                absentDays: absent,
                leaveDays: leave,
                halfDays: halfDay,
                payableDays: Math.round(payableDays),
                attendancePercentage: percentage,
                workingDays: workingDays,
            });
        });

        return { success: true, data: summaries };
    },

    // Get daily attendance for a specific employee
    getDailyAttendance: async (employeeId, month = 1, year = 2026) => {
        await delay(MOCK_API_DELAY);
        const attendance = dataStore.getAttendanceForEmployee(employeeId, month, year);
        return { success: true, data: attendance };
    },

    // Mark attendance for an employee - WITH EXPLICIT DEBUGGING
    markAttendance: async (employeeId, date, status, notes = '') => {
        console.log('=== ATTENDANCE SERVICE: markAttendance CALLED ===');
        console.log('employeeId:', employeeId);
        console.log('date:', date);
        console.log('status:', status);

        try {
            // Call dataStore to save
            const record = dataStore.markAttendance(employeeId, date, status, notes);
            console.log('DataStore returned record:', record);

            // Immediately verify it was saved
            const [year, month] = date.split('-');
            const savedData = dataStore.getAttendanceForEmployee(employeeId, parseInt(month), parseInt(year));
            console.log('Verification - Saved attendance data:', savedData);

            // Check localStorage directly
            const rawStorage = localStorage.getItem('arris_hrms_data');
            const parsed = rawStorage ? JSON.parse(rawStorage) : null;
            console.log('Direct localStorage check - attendance object:', parsed?.attendance);

            return {
                success: true,
                message: `Attendance marked as ${status} for ${date}`,
                data: record,
            };
        } catch (error) {
            console.error('=== ERROR in markAttendance ===', error);
            return {
                success: false,
                message: 'Failed to mark attendance: ' + error.message,
            };
        }
    },

    // Bulk mark attendance for multiple employees - same date
    bulkMarkAttendance: async (employeeIds, date, status) => {
        console.log('=== BULK MARK ATTENDANCE ===');
        console.log('Employees:', employeeIds);
        console.log('Date:', date);
        console.log('Status:', status);

        const results = [];

        for (const empId of employeeIds) {
            try {
                const record = dataStore.markAttendance(empId, date, status, '');
                results.push({ employeeId: empId, success: true, data: record });
            } catch (error) {
                results.push({ employeeId: empId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log('Bulk mark complete. Success:', successCount, '/', results.length);

        return {
            success: successCount > 0,
            message: `Marked ${successCount} of ${results.length} employees as ${status}`,
            data: results,
        };
    },

    // Bulk mark present for entire month
    bulkMarkPresent: async (employeeIds, month, year) => {
        await delay(MOCK_API_DELAY);

        const daysInMonth = new Date(year, month, 0).getDate();
        let totalRecords = 0;

        for (const empId of employeeIds) {
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayOfWeek = new Date(date).getDay();

                if (dayOfWeek !== 0) { // Skip Sundays
                    dataStore.markAttendance(empId, date, 'present', '');
                    totalRecords++;
                }
            }
        }

        return {
            success: true,
            message: `Marked ${employeeIds.length} employees as present for the entire month (${totalRecords} records)`,
        };
    },

    // Bulk mark absent  
    bulkMarkAbsent: async (employeeIds, month, year) => {
        await delay(MOCK_API_DELAY);

        const daysInMonth = new Date(year, month, 0).getDate();
        let totalRecords = 0;

        for (const empId of employeeIds) {
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayOfWeek = new Date(date).getDay();

                if (dayOfWeek !== 0) {
                    dataStore.markAttendance(empId, date, 'absent', '');
                    totalRecords++;
                }
            }
        }

        return {
            success: true,
            message: `Marked ${employeeIds.length} employees as absent for the entire month`,
        };
    },

    // Reset month attendance
    resetMonthAttendance: async (month, year) => {
        await delay(MOCK_API_DELAY);

        const employees = dataStore.getEmployees();

        for (const emp of employees) {
            const key = `${emp.id}-${year}-${month}`;
            if (dataStore.data.attendance[key]) {
                delete dataStore.data.attendance[key];
            }
        }

        dataStore.saveToStorage();

        return {
            success: true,
            message: `Reset all attendance for ${getMonthName(month)} ${year}`,
        };
    },
};

export default attendanceService;
