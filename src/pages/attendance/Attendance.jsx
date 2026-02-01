import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Calendar, CheckSquare, XSquare } from 'lucide-react';
import attendanceService from '../../services/attendanceService';
import employeeService from '../../services/employeeService';
import dataStore from '../../store/dataStore';
import Tag from '../../components/common/Tag';
import toast from 'react-hot-toast';
import './Attendance.css';

const Attendance = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [filteredAttendance, setFilteredAttendance] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    useEffect(() => {
        loadData();
    }, [month, year]);

    useEffect(() => {
        filterAttendance();
    }, [searchQuery, attendance]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load employees
            const empResponse = await employeeService.getEmployees();
            if (empResponse.success) {
                setEmployees(empResponse.data);
            }

            // Load attendance summaries
            const response = await attendanceService.getMonthlyAttendance(month, year);
            if (response.success) {
                setAttendance(response.data);
                setFilteredAttendance(response.data);
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            toast.error('Failed to load attendance');
        } finally {
            setLoading(false);
        }
    };

    const filterAttendance = () => {
        if (!searchQuery.trim()) {
            setFilteredAttendance(attendance);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = attendance.filter(att =>
            att.employeeName?.toLowerCase().includes(query) ||
            att.employeeCode?.toLowerCase().includes(query)
        );
        setFilteredAttendance(filtered);
    };

    // Mark attendance for selected date only
    const handleMarkSelectedDate = async (status) => {
        console.log('=== handleMarkSelectedDate FUNCTION ENTERED ===');
        console.log('status parameter:', status);
        console.log('selectedEmployees state:', selectedEmployees);
        console.log('selectedDate state:', selectedDate);

        if (selectedEmployees.length === 0) {
            console.log('No employees selected, showing error toast');
            toast.error('Please select employees first');
            return;
        }

        try {
            console.log('Starting to mark attendance for', selectedEmployees.length, 'employees');

            let successCount = 0;
            let errorCount = 0;

            // Mark each selected employee for the selected date only
            for (const empId of selectedEmployees) {
                const response = await attendanceService.markAttendance(empId, selectedDate, status);
                if (response.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error('Failed to mark:', empId, response);
                }
            }

            if (successCount > 0) {
                toast.success(`Marked ${successCount} employee(s) as ${status} for ${selectedDate}`);
            }
            if (errorCount > 0) {
                toast.error(`Failed to mark ${errorCount} employee(s)`);
            }

            // Reload data to show updated attendance
            await loadData();
            setSelectedEmployees([]);
        } catch (error) {
            console.error('Error in handleMarkSelectedDate:', error);
            toast.error('Failed to mark attendance');
        }
    };

    const toggleSelectEmployee = (employeeId) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedEmployees.length === filteredAttendance.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(filteredAttendance.map(att => att.employeeId));
        }
    };

    const getAttendanceColor = (percentage) => {
        if (percentage >= 90) return 'success';
        if (percentage >= 75) return 'primary';
        if (percentage >= 60) return 'warning';
        return 'danger';
    };

    const viewDetails = (employeeId) => {
        navigate(`/attendance/${employeeId}`);
    };

    // Get today's status for an employee
    const getTodayStatus = (employeeId) => {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const attendance = dataStore.getAttendanceForEmployee(employeeId, currentMonth, currentYear);
        const todayRecord = attendance.find(a => a.date === today);

        return todayRecord ? todayRecord.status : null;
    };

    if (loading) {
        return (
            <div className="attendance-loading">
                <div className="loader"></div>
                <p>Loading attendance...</p>
            </div>
        );
    }

    return (
        <div className="attendance-page">
            <div className="attendance-header">
                <div>
                    <h1 className="attendance-title">Attendance Management</h1>
                    <p className="attendance-subtitle">Track and manage employee attendance</p>
                </div>
            </div>

            <div className="attendance-controls">
                <div className="month-selector-bar">
                    <Calendar size={18} />
                    <label>View Month:</label>
                    <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>
                                {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                        {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <span className="selector-separator">|</span>
                    <label>Mark for Date:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-input"
                    />
                </div>

                <div className="bulk-actions">
                    <button
                        className="btn-bulk btn-success"
                        onClick={() => {
                            console.log('=== BUTTON CLICKED ===');
                            console.log('selectedEmployees:', selectedEmployees);
                            console.log('selectedDate:', selectedDate);
                            handleMarkSelectedDate('present');
                        }}
                        title={`Mark selected as present for ${selectedDate}`}
                    >
                        <CheckSquare size={16} />
                        Mark Present ({selectedEmployees.length} selected)
                    </button>

                    <button
                        className="btn-bulk btn-danger"
                        onClick={() => handleMarkSelectedDate('absent')}
                        disabled={selectedEmployees.length === 0}
                        title={`Mark selected as absent for ${selectedDate}`}
                    >
                        <XSquare size={16} />
                        Mark Absent ({selectedEmployees.length > 0 ? selectedEmployees.length : 0} selected)
                    </button>
                </div>
            </div>

            <div className="attendance-search">
                <input
                    type="text"
                    placeholder="Search by name or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="attendance-table-container">
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th className="col-check">
                                <input
                                    type="checkbox"
                                    checked={selectedEmployees.length === filteredAttendance.length && filteredAttendance.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="col-id">Staff ID</th>
                            <th className="col-name">Staff Name</th>
                            <th className="col-date">Date</th>
                            <th className="col-status-today">Today</th>
                            <th className="col-number">Work</th>
                            <th className="col-number">Total</th>
                            <th className="col-number">Pres</th>
                            <th className="col-number">Abs</th>
                            <th className="col-number">Pay</th>
                            <th className="col-percent">Att %</th>
                            <th className="col-action">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAttendance.map(att => {
                            const todayStatus = getTodayStatus(att.employeeId);
                            return (
                                <tr key={att.employeeId}>
                                    <td className="col-check">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployees.includes(att.employeeId)}
                                            onChange={() => toggleSelectEmployee(att.employeeId)}
                                        />
                                    </td>
                                    <td className="col-id emp-code">{att.employeeCode}</td>
                                    <td className="col-name emp-name" title={att.employeeName}>{att.employeeName}</td>
                                    <td className="col-date">{new Date(2000, att.month - 1).toLocaleString('default', { month: 'short' })} {att.year}</td>
                                    <td className="col-status-today">
                                        <div className="today-status-cell">
                                            {todayStatus ? (
                                                <Tag color={
                                                    todayStatus === 'present' ? 'success' :
                                                        todayStatus === 'leave' ? 'warning' :
                                                            todayStatus === 'half-day' ? 'primary' :
                                                                'danger'
                                                }>
                                                    {todayStatus === 'present' ? 'Present' :
                                                        todayStatus === 'absent' ? 'Absent' :
                                                            todayStatus.charAt(0).toUpperCase() + todayStatus.slice(1)}
                                                </Tag>
                                            ) : (
                                                <span className="not-marked" style={{ fontSize: '11px', fontStyle: 'italic', color: '#999' }}>--</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="col-number">{att.workingDays}</td>
                                    <td className="col-number">{att.totalDays}</td>
                                    <td className="col-number present-days">{att.presentDays}</td>
                                    <td className="col-number absent-days">{att.absentDays}</td>
                                    <td className="col-number">{att.payableDays}</td>
                                    <td className="col-percent">
                                        <Tag color={getAttendanceColor(att.attendancePercentage)}>
                                            {att.attendancePercentage}%
                                        </Tag>
                                    </td>
                                    <td className="col-action">
                                        <button
                                            className="btn-view-details"
                                            onClick={() => viewDetails(att.employeeId)}
                                            title="Details"
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredAttendance.length === 0 && (
                    <div className="attendance-empty">
                        <p>No employees found</p>
                    </div>
                )}
            </div>

            <div className="attendance-summary">
                Showing {filteredAttendance.length} of {attendance.length} employees
                {selectedEmployees.length > 0 && ` | ${selectedEmployees.length} selected`}
                <span className="info-text"> | Viewing {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })} {year}</span>
            </div>
        </div>
    );
};

export default Attendance;
