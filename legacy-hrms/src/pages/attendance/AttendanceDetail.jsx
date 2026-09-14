import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calendar } from 'lucide-react';
import attendanceService from '../../services/attendanceService';
import employeeService from '../../services/employeeService';
import toast from 'react-hot-toast';
import './AttendanceDetail.css';

const AttendanceDetail = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadData();
    }, [employeeId, month, year]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load employee details
            const empResponse = await employeeService.getEmployee(employeeId);
            if (empResponse.success) {
                setEmployee(empResponse.data);
            }

            // Load attendance
            const attResponse = await attendanceService.getDailyAttendance(employeeId, month, year);
            if (attResponse.success) {
                setAttendance(attResponse.data);
            }
        } catch (error) {
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (month, year) => {
        return new Date(year, month, 0).getDate();
    };

    const generateDaysArray = () => {
        const daysInMonth = getDaysInMonth(month, year);
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const existing = attendance.find(a => a.date === date);
            const dayOfWeek = new Date(date).getDay();

            days.push({
                day,
                date,
                dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                // Only show status if actually saved, otherwise null (not marked)
                status: existing?.status || (dayOfWeek === 0 ? 'holiday' : null),
                notes: existing?.notes || '',
                isMarked: !!existing,
            });
        }

        return days;
    };

    const handleStatusChange = (date, newStatus) => {
        setAttendance(prev => {
            const existing = prev.find(a => a.date === date);
            if (existing) {
                return prev.map(a => a.date === date ? { ...a, status: newStatus } : a);
            } else {
                return [...prev, { date, status: newStatus, notes: '' }];
            }
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            // Save all attendance records
            for (const att of attendance) {
                if (att.status) {
                    await attendanceService.markAttendance(employeeId, att.date, att.status, att.notes);
                }
            }

            toast.success('Attendance saved successfully');
            setHasChanges(false);
            loadData();
        } catch (error) {
            toast.error('Failed to save attendance');
        }
    };

    const calculateStats = (days) => {
        const workingDays = days.filter(d => d.dayName !== 'Sun').length;
        const markedDays = days.filter(d => d.isMarked);
        const present = markedDays.filter(d => d.status === 'present').length;
        const absent = markedDays.filter(d => d.status === 'absent').length;
        const percentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(1) : 0;

        return { workingDays, present, absent, marked: markedDays.length, percentage };
    };

    if (loading) {
        return (
            <div className="attendance-detail-loading">
                <div className="loader"></div>
                <p>Loading attendance...</p>
            </div>
        );
    }

    const days = generateDaysArray();
    const stats = calculateStats(days);

    return (
        <div className="attendance-detail-page">
            <div className="detail-header">
                <button className="btn-back" onClick={() => navigate('/attendance')}>
                    <ArrowLeft size={20} />
                    Back to Attendance
                </button>

                {hasChanges && (
                    <button className="btn-save" onClick={handleSave}>
                        <Save size={18} />
                        Save Changes
                    </button>
                )}
            </div>

            <div className="employee-info-card">
                <h1 className="employee-name">
                    {employee?.firstName} {employee?.lastName}
                </h1>
                <p className="employee-meta">
                    {employee?.employeeId} • {employee?.designation} • {employee?.department}
                </p>
            </div>

            <div className="month-selector">
                <label>
                    <Calendar size={16} />
                    Select Month:
                </label>
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
            </div>

            <div className="stats-summary">
                <div className="stat-box">
                    <div className="stat-value">{stats.workingDays}</div>
                    <div className="stat-label">Working Days</div>
                </div>
                <div className="stat-box stat-box-success">
                    <div className="stat-value">{stats.present}</div>
                    <div className="stat-label">Present</div>
                </div>
                <div className="stat-box stat-box-danger">
                    <div className="stat-value">{stats.absent}</div>
                    <div className="stat-label">Absent</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{stats.percentage}%</div>
                    <div className="stat-label">Attendance</div>
                </div>
            </div>

            <div className="attendance-grid">
                {days.map(day => (
                    <div
                        key={day.date}
                        className={`day-card ${day.status ? 'day-card-' + day.status : 'day-card-unmarked'} ${day.dayName === 'Sun' ? 'day-card-sunday' : ''}`}
                    >
                        <div className="day-number">{day.day}</div>
                        <div className="day-name">{day.dayName}</div>

                        {day.dayName !== 'Sun' && (
                            <div className="day-controls">
                                <button
                                    className={`status-btn ${day.status === 'present' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(day.date, 'present')}
                                >
                                    P
                                </button>
                                <button
                                    className={`status-btn ${day.status === 'absent' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(day.date, 'absent')}
                                >
                                    A
                                </button>
                            </div>
                        )}

                        {day.dayName === 'Sun' && (
                            <div className="day-holiday">Holiday</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttendanceDetail;
