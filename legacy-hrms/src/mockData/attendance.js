// Mock Attendance Data for ARRIS RESTAURANT HRMS

// Generate attendance data for current month (January 2026)
const generateMonthlyAttendance = () => {
    const employees = [
        { id: 'emp-001', employeeId: 'ARR001', name: 'Rajesh Kumar' },
        { id: 'emp-002', employeeId: 'ARR002', name: 'Priya Sharma' },
        { id: 'emp-003', employeeId: 'ARR003', name: 'Amit Patel' },
        { id: 'emp-004', employeeId: 'ARR004', name: 'Sneha Reddy' },
        { id: 'emp-005', employeeId: 'ARR005', name: 'Arjun Kapoor' },
        { id: 'emp-006', employeeId: 'ARR006', name: 'Pooja Nair' },
        { id: 'emp-007', employeeId: 'ARR007', name: 'Rahul Verma' },
        { id: 'emp-008', employeeId: 'ARR008', name: 'Neha Kapoor' },
        { id: 'emp-009', employeeId: 'ARR009', name: 'Karthik Nair' },
        { id: 'emp-010', employeeId: 'ARR010', name: 'Divya Iyer' },
        { id: 'emp-011', employeeId: 'ARR011', name: 'Rohan Gupta' },
        { id: 'emp-012', employeeId: 'ARR012', name: 'Sonal Desai' },
        { id: 'emp-013', employeeId: 'ARR013', name: 'Aditya Khanna' },
        { id: 'emp-014', employeeId: 'ARR014', name: 'Kavita Jain' },
        { id: 'emp-015', employeeId: 'ARR015', name: 'Manish Shah' },
        { id: 'emp-016', employeeId: 'ARR016', name: 'Ritu Agarwal' },
        { id: 'emp-017', employeeId: 'ARR017', name: 'Nikhil Choudhary' },
    ];

    const attendanceData = [];

    employees.forEach((emp, index) => {
        const totalDays = 20; // Working days in January 2026 so far
        const presentDays = Math.floor(Math.random() * 3) + 17; // 17-19 days present
        const absentDays = totalDays - presentDays;
        const payableDays = presentDays;

        attendanceData.push({
            id: `att-${emp.id}`,
            employeeId: emp.id,
            employeeCode: emp.employeeId,
            employeeName: emp.name,
            month: 'January',
            year: 2026,
            totalDays: totalDays,
            presentDays: presentDays,
            absentDays: absentDays,
            payableDays: payableDays,
            attendancePercentage: ((presentDays / totalDays) * 100).toFixed(1),
        });
    });

    return attendanceData;
};

// Generate daily attendance records for a specific employee
const generateDailyAttendance = (employeeId, month = 1, year = 2026) => {
    const dailyRecords = [];
    const daysInMonth = 31; // January has 31 days

    for (let day = 1; day <= 20; day++) { // Only up to day 20 (current date)
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(date).getDay();

        // Skip Sundays (assuming Sunday is off day)
        if (dayOfWeek === 0) {
            dailyRecords.push({
                id: `daily-${employeeId}-${date}`,
                employeeId: employeeId,
                date: date,
                status: 'holiday',
                checkIn: null,
                checkOut: null,
                workingHours: 0,
                notes: 'Weekly off',
            });
            continue;
        }

        // Randomly assign some absents (10% chance)
        const isAbsent = Math.random() < 0.1;

        if (isAbsent) {
            dailyRecords.push({
                id: `daily-${employeeId}-${date}`,
                employeeId: employeeId,
                date: date,
                status: 'absent',
                checkIn: null,
                checkOut: null,
                workingHours: 0,
                notes: 'Absent',
            });
        } else {
            // Generate realistic check-in/check-out times
            const checkInHour = 9 + Math.floor(Math.random() * 2); // 9-10 AM
            const checkInMinute = Math.floor(Math.random() * 60);
            const checkOutHour = 18 + Math.floor(Math.random() * 2); // 6-7 PM
            const checkOutMinute = Math.floor(Math.random() * 60);

            const workingHours = (checkOutHour - checkInHour) + ((checkOutMinute - checkInMinute) / 60);

            dailyRecords.push({
                id: `daily-${employeeId}-${date}`,
                employeeId: employeeId,
                date: date,
                status: 'present',
                checkIn: `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`,
                checkOut: `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`,
                workingHours: workingHours.toFixed(1),
                notes: '',
            });
        }
    }

    return dailyRecords;
};

export const mockMonthlyAttendance = generateMonthlyAttendance();

export const mockDailyAttendance = {
    generateForEmployee: (employeeId, month, year) => generateDailyAttendance(employeeId, month, year),
};

export default mockMonthlyAttendance;
