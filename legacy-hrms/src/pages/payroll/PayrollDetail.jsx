import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check } from 'lucide-react';
import payrollService from '../../services/payrollService';
import Tag from '../../components/common/Tag';
import toast from 'react-hot-toast';
import './PayrollDetail.css';

const PayrollDetail = () => {
    const { year, month } = useParams();
    const navigate = useNavigate();
    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayrollDetail();
    }, [year, month]);

    const loadPayrollDetail = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getPayrollByMonth(parseInt(month), parseInt(year));

            if (response.success) {
                setPayroll(response.data);
            } else {
                toast.error('Payroll not found');
                navigate('/payroll/history');
            }
        } catch (error) {
            toast.error('Failed to load payroll details');
            navigate('/payroll/history');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (employeeId = null) => {
        try {
            const response = await payrollService.markAsPaid(payroll.id, employeeId);

            if (response.success) {
                toast.success('Marked as paid successfully');
                loadPayrollDetail();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to mark as paid');
        }
    };

    const handleApprove = async () => {
        try {
            const response = await payrollService.approvePayroll(payroll.id);

            if (response.success) {
                toast.success('Payroll approved successfully');
                loadPayrollDetail();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to approve payroll');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusColor = (status) => {
        const colors = {
            paid: 'success',
            approved: 'success',
            draft: 'warning',
        };
        return colors[status] || 'secondary';
    };

    if (loading) {
        return (
            <div className="payroll-detail-loading">
                <div className="loader"></div>
                <p>Loading payroll details...</p>
            </div>
        );
    }

    if (!payroll) {
        return null;
    }

    return (
        <div className="payroll-detail-page">
            <div className="detail-header">
                <button className="btn-back" onClick={() => navigate('/payroll/history')}>
                    <ArrowLeft size={20} />
                    Back to Payroll History
                </button>

                <div className="header-actions">
                    {payroll.status === 'draft' && (
                        <button className="btn-approve" onClick={handleApprove}>
                            <Check size={18} />
                            Approve Payroll
                        </button>
                    )}
                    {payroll.status !== 'paid' && (
                        <button className="btn-primary" onClick={() => handleMarkAsPaid()}>
                            Mark All as Paid
                        </button>
                    )}
                </div>
            </div>

            <div className="payroll-summary-card">
                <h1 className="payroll-month">{payroll.monthName}</h1>
                <Tag color={getStatusColor(payroll.status)}>{payroll.status}</Tag>

                <div className="summary-stats">
                    <div className="stat">
                        <div className="stat-label">Total Employees</div>
                        <div className="stat-value">{payroll.totalEmployees}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-label">Total Gross</div>
                        <div className="stat-value">{formatCurrency(payroll.totalGross)}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-label">Total Deductions</div>
                        <div className="stat-value text-danger">{formatCurrency(payroll.totalDeductions)}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-label">Total Net Pay</div>
                        <div className="stat-value text-success">{formatCurrency(payroll.totalNet)}</div>
                    </div>
                </div>
            </div>

            <div className="payroll-records">
                <h2 className="records-title">Employee Payslips</h2>

                <div className="records-table-container">
                    <table className="records-table">
                        <thead>
                            <tr>
                                <th>Staff ID</th>
                                <th>Staff Name</th>
                                <th>Designation</th>
                                <th>Days Worked</th>
                                <th>Gross Salary</th>
                                <th>Deductions</th>
                                <th>Net Pay</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payroll.records?.map(record => (
                                <tr key={record.id}>
                                    <td className="emp-code">{record.employeeCode}</td>
                                    <td className="emp-name">{record.employeeName}</td>
                                    <td>{record.designation}</td>
                                    <td>{record.daysWorked} / {record.workingDays}</td>
                                    <td className="amount">{formatCurrency(record.grossSalary)}</td>
                                    <td className="amount text-danger">{formatCurrency(record.totalDeductions)}</td>
                                    <td className="amount text-success">{formatCurrency(record.netSalary)}</td>
                                    <td>
                                        <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
                                    </td>
                                    <td>
                                        {record.status !== 'paid' && (
                                            <button
                                                className="btn-action"
                                                onClick={() => handleMarkAsPaid(record.employeeId)}
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PayrollDetail;
