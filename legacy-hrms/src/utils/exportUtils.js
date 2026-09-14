import { formatDate } from './dateUtils';

// Export data to CSV
export const exportToCSV = (data, filename, headers = null) => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    try {
        // Generate headers from first object keys if not provided
        const csvHeaders = headers || Object.keys(data[0]);

        // Create CSV content
        let csvContent = csvHeaders.join(',') + '\n';

        data.forEach(row => {
            const values = csvHeaders.map(header => {
                const value = row[header];
                // Handle special cases
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        });

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return false;
    }
};

// Export attendance to CSV
export const exportAttendanceToCSV = (attendanceData, month, year) => {
    const formattedData = attendanceData.map(record => ({
        'Employee ID': record.employeeId,
        'Employee Name': record.employeeName,
        'Department': record.department,
        'Present Days': record.presentDays,
        'Absent Days': record.absentDays,
        'Leave Days': record.leaveDays,
        'Total Working Days': record.totalWorkingDays,
        'Percentage': `${record.attendancePercentage}%`,
    }));

    const filename = `attendance_${month}_${year}`;
    return exportToCSV(formattedData, filename);
};

// Export payroll to CSV
export const exportPayrollToCSV = (payrollData, month, year) => {
    const formattedData = payrollData.map(record => ({
        'Employee ID': record.employeeId,
        'Employee Name': record.employeeName,
        'Department': record.department,
        'Designation': record.designation,
        'Payable Days': record.payableDays,
        'Gross Salary': record.grossSalary,
        'Deductions': record.totalDeductions,
        'Net Salary': record.netSalary,
        'Status': record.status,
    }));

    const filename = `payroll_${month}_${year}`;
    return exportToCSV(formattedData, filename);
};

// Export employees to CSV
export const exportEmployeesToCSV = (employees) => {
    const formattedData = employees.map(emp => ({
        'Employee ID': emp.employeeId,
        'Name': `${emp.firstName} ${emp.lastName}`,
        'Email': emp.email,
        'Phone': emp.phone,
        'Department': emp.department,
        'Designation': emp.designation,
        'Employment Type': emp.employmentType,
        'Status': emp.status,
        'Joining Date': formatDate(emp.joiningDate),
        'Site': emp.site,
    }));

    const filename = 'employees_list';
    return exportToCSV(formattedData, filename);
};

// Print function helper
export const printElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found for printing');
        return false;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    return true;
};
