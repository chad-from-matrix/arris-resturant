import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ClipboardList, TrendingUp, Users } from 'lucide-react';
import './SalaryPayroll.css';

const SalaryPayroll = () => {
    const navigate = useNavigate();

    const quickCards = [
        {
            title: 'Salary Management',
            description: 'View and edit employee salaries',
            icon: <DollarSign size={40} />,
            color: 'primary',
            route: '/salary/management',
            stats: 'Manage compensation',
        },
        {
            title: 'Salary Structures',
            description: 'Manage salary templates and components',
            icon: <ClipboardList size={40} />,
            color: 'success',
            route: '/salary/structures',
            stats: 'Templates & structures',
        },
        {
            title: 'Payroll History',
            description: 'View past payroll runs and records',
            icon: <TrendingUp size={40} />,
            color: 'info',
            route: '/payroll/history',
            stats: 'Historical payrolls',
        },
        {
            title: 'Generate Payroll',
            description: 'Create new payroll for the month',
            icon: <Users size={40} />,
            color: 'warning',
            route: '/payroll/history',
            stats: 'Monthly payroll',
        },
    ];

    return (
        <div className="salary-payroll-page">
            <div className="page-header">
                <h1 className="page-title">Salary & Payroll</h1>
                <p className="page-subtitle">
                    Manage employee compensation, salary structures, and payroll processing
                </p>
            </div>

            <div className="salary-payroll-grid">
                {quickCards.map((card, index) => (
                    <div
                        key={index}
                        className={`salary-payroll-card card-${card.color}`}
                        onClick={() => navigate(card.route)}
                    >
                        <div className="card-icon">{card.icon}</div>
                        <div className="card-content">
                            <h3 className="card-title">{card.title}</h3>
                            <p className="card-description">{card.description}</p>
                            <div className="card-stats">{card.stats}</div>
                        </div>
                        <div className="card-arrow">→</div>
                    </div>
                ))}
            </div>

            <div className="info-section">
                <div className="info-card">
                    <h3>Salary Management</h3>
                    <p>View all employee salaries in a comprehensive table. Edit salary components including basic salary, HRA, conveyance, and special allowances. Monthly gross and annual CTC are calculated automatically.</p>
                    <button className="btn-secondary" onClick={() => navigate('/salary/management')}>
                        Go to Salary Management
                    </button>
                </div>

                <div className="info-card">
                    <h3>Salary Structures</h3>
                    <p>Create and manage reusable salary templates. Define salary components, set standard amounts, and apply structures to employees for consistent compensation management.</p>
                    <button className="btn-secondary" onClick={() => navigate('/salary/structures')}>
                        Manage Structures
                    </button>
                </div>

                <div className="info-card">
                    <h3>Payroll Processing</h3>
                    <p>Generate monthly payroll based on attendance data. The system automatically calculates salaries, deductions (PF, ESI, TDS), and net pay. Approve and mark payrolls as paid.</p>
                    <button className="btn-secondary" onClick={() => navigate('/payroll/history')}>
                        View Payroll History
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalaryPayroll;
