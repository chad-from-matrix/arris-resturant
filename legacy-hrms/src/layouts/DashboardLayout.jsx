import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="dashboard-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

            <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Header />

                <div className="dashboard-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
