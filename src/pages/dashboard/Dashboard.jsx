import React, { useState, useEffect } from 'react';
import { Users, Building2, MapPin, CalendarClock, DollarSign, ClipboardList } from 'lucide-react';
import employeeService from '../../services/employeeService';
import departmentService from '../../services/departmentService';
import siteService from '../../services/siteService';
import './Dashboard.css';

const StatCard = ({ icon, label, value, color = 'primary', trend }) => {
    return (
        <div className="stat-card">
            <div className={`stat-icon stat-icon-${color}`}>
                {icon}
            </div>
            <div className="stat-content">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
                {trend && <div className="stat-trend">{trend}</div>}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalDepartments: 0,
        totalSites: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load stats
            const [employeesRes, departmentsRes, sitesRes] = await Promise.all([
                employeeService.getEmployees(),
                departmentService.getDepartments(),
                siteService.getSites(),
            ]);

            setStats({
                totalEmployees: employeesRes.data?.length || 0,
                totalDepartments: departmentsRes.data?.length || 0,
                totalSites: sitesRes.data?.length || 0,
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loader"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">Welcome to ARRIS RESTAURANT HRMS</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon={<Users size={28} />}
                    label="Total Staff"
                    value={stats.totalEmployees}
                    color="primary"
                    trend="+5% from last month"
                />
                <StatCard
                    icon={<Building2 size={28} />}
                    label="Departments"
                    value={stats.totalDepartments}
                    color="success"
                />
                <StatCard
                    icon={<MapPin size={28} />}
                    label="Restaurant Branches"
                    value={stats.totalSites}
                    color="warning"
                />
            </div>

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Quick Actions */}
                <div className="dashboard-widget dashboard-widget-full">
                    <div className="widget-header">
                        <h3 className="widget-title">Quick Actions</h3>
                    </div>
                    <div className="widget-body">
                        <div className="quick-actions">
                            <a href="/salary/management" className="quick-action">
                                <div className="quick-action-icon">
                                    <DollarSign size={24} />
                                </div>
                                <div className="quick-action-content">
                                    <div className="quick-action-label">Payroll History</div>
                                    <div className="quick-action-desc">View past payrolls</div>
                                </div>
                            </a>

                            <a href="/salary/structures" className="quick-action">
                                <div className="quick-action-icon">
                                    <ClipboardList size={24} />
                                </div>
                                <div className="quick-action-content">
                                    <div className="quick-action-label">Salary Structures</div>
                                    <div className="quick-action-desc">Manage salary components</div>
                                </div>
                            </a>

                            <a href="/attendance" className="quick-action">
                                <div className="quick-action-icon">
                                    <CalendarClock size={24} />
                                </div>
                                <div className="quick-action-content">
                                    <div className="quick-action-label">Attendance</div>
                                    <div className="quick-action-desc">Mark and view attendance</div>
                                </div>
                            </a>

                            <a href="/employees" className="quick-action">
                                <div className="quick-action-icon">
                                    <Users size={24} />
                                </div>
                                <div className="quick-action-content">
                                    <div className="quick-action-label">Staff Management</div>
                                    <div className="quick-action-desc">Manage staff records</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
