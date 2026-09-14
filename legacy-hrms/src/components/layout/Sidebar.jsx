import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Building2, Users, CalendarDays, DollarSign,
    Calendar, Settings, HelpCircle, LogOut, ChevronDown, ChevronRight,
    Menu, X
} from 'lucide-react';
import authService from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import toast from 'react-hot-toast';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle }) => {
    const navigate = useNavigate();
    const [expandedMenus, setExpandedMenus] = useState(['hr']);
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleMenu = (menu) => {
        setExpandedMenus(prev =>
            prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
        );
    };

    const handleLogout = async () => {
        await authService.logout();
        toast.success('Logged out successfully');
        navigate(ROUTES.LOGIN);
    };

    const menuItems = [
        { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: ROUTES.EMPLOYEES, label: 'Employees', icon: <Users size={20} /> },
        { path: ROUTES.ATTENDANCE, label: 'Attendance', icon: <CalendarDays size={20} /> },
        { path: ROUTES.SALARY_STRUCTURE, label: 'Salary & Payroll', icon: <DollarSign size={20} /> },
        { path: ROUTES.SITES, label: 'Sites', icon: <Building2 size={20} /> },
        { path: ROUTES.SETTINGS, label: 'Settings', icon: <Settings size={20} /> },
        { path: ROUTES.HELP, label: 'Help', icon: <HelpCircle size={20} /> },
    ];

    const renderMenuItem = (item) => {
        if (item.submenu) {
            const isExpanded = expandedMenus.includes(item.key);
            return (
                <div key={item.key} className="sidebar-menu-group">
                    <button
                        className="sidebar-menu-item"
                        onClick={() => toggleMenu(item.key)}
                    >
                        <span className="sidebar-menu-icon">{item.icon}</span>
                        {!collapsed && (
                            <>
                                <span className="sidebar-menu-label">{item.label}</span>
                                <span className="sidebar-menu-arrow">
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </span>
                            </>
                        )}
                    </button>

                    {isExpanded && !collapsed && (
                        <div className="sidebar-submenu">
                            {item.submenu.map(subItem => (
                                <NavLink
                                    key={subItem.path}
                                    to={subItem.path}
                                    className={({ isActive }) =>
                                        `sidebar-submenu-item ${isActive ? 'active' : ''}`
                                    }
                                >
                                    {subItem.label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                    `sidebar-menu-item ${isActive ? 'active' : ''}`
                }
            >
                <span className="sidebar-menu-icon">{item.icon}</span>
                {!collapsed && <span className="sidebar-menu-label">{item.label}</span>}
            </NavLink>
        );
    };

    return (
        <>
            {/* Mobile toggle button */}
            <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                <Menu size={24} />
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <h1 className="sidebar-brand">
                        {collapsed ? 'AR' : 'ARRIS RESTAURANT'}
                    </h1>

                    {!collapsed && (
                        <button className="sidebar-close-mobile" onClick={() => setMobileOpen(false)}>
                            <X size={24} />
                        </button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map(renderMenuItem)}
                </nav>

                <div className="sidebar-footer">
                    <button
                        className="sidebar-menu-item"
                        onClick={handleLogout}
                    >
                        <span className="sidebar-menu-icon"><LogOut size={20} /></span>
                        {!collapsed && <span className="sidebar-menu-label">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
            )}
        </>
    );
};

export default Sidebar;
