import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Download, Plus } from 'lucide-react';
import payrollService from '../../services/payrollService';
import Tag from '../../components/common/Tag';
import toast from 'react-hot-toast';
import './Payroll.css';

const PayrollHistory = () => {
    const navigate = useNavigate();
    const [payrollHistory, setPayrollHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generateForm, setGenerateForm] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });

    useEffect(() => {
        loadPayrollHistory();
    }, []);

    const loadPayrollHistory = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getPayrollHistory();
            if (response.success) {
                const sorted = response.data.sort((a, b) => {
                    if (b.year !== a.year) return b.year - a.year;
                    return b.month - a.month;
                });
                setPayrollHistory(sorted);
            }
        } catch (error) {
            console.error('Error loading payroll history:', error);
            toast.error('Failed to load payroll history');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePayroll = async () => {
        try {
            setGenerating(true);
            const response = await payrollService.generatePayroll(
                generateForm.month,
                generateForm.year
            );

            if (response.success) {
                toast.success('Payroll generated successfully');
                setShowGenerateModal(false);
                loadPayrollHistory();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to generate payroll');
        } finally {
            setGenerating(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            paid: 'success',
            approved: 'success',
            draft: 'warning',
            pending: 'warning',
        };
        return colors[status] || 'secondary';
    };

    const viewDetails = (month, year) => {
        navigate(`/payroll/details/${year}/${month}`);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="payroll-loading">
                <div className="loader"></div>
                <p>Loading payroll history...</p>
            </div>
        );
    }

    return (
        <div className="payroll-page">
            <div className="payroll-header">
                <div>
                    <h1 className="payroll-title">Payroll History</h1>
                    <p className="payroll-subtitle">View and manage payroll runs</p>
                </div>

                <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
                    <Plus size={20} />
                    Generate Payroll
                </button>
            </div>

            <div className="payroll-table-container">
                <table className="payroll-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Employees</th>
                            <th>Total Gross</th>
                            <th>Total Deductions</th>
                            <th>Total Net Pay</th>
                            <th>Status</th>
                            <th>Generated Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollHistory.map(payroll => (
                            <tr key={payroll.id}>
                                <td className="payroll-period">{payroll.monthName}</td>
                                <td>{payroll.totalEmployees}</td>
                                <td className="payroll-amount">{formatCurrency(payroll.totalGross)}</td>
                                <td className="payroll-amount">{formatCurrency(payroll.totalDeductions)}</td>
                                <td className="payroll-net">{formatCurrency(payroll.totalNet)}</td>
                                <td>
                                    <Tag color={getStatusColor(payroll.status)}>
                                        {payroll.status}
                                    </Tag>
                                </td>
                                <td>{payroll.generatedDate || '-'}</td>
                                <td>
                                    <button
                                        className="btn-view"
                                        onClick={() => viewDetails(payroll.month, payroll.year)}
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {payrollHistory.length === 0 && (
                    <div className="payroll-empty">
                        <p>No payroll records found</p>
                        <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
                            Generate First Payroll
                        </button>
                    </div>
                )}
            </div>

            <div className="payroll-summary">
                Total {payrollHistory.length} payroll runs
            </div>

            {/* Generate Payroll Modal */}
            {showGenerateModal && (
                <>
                    <div className="modal-overlay" onClick={() => setShowGenerateModal(false)} />
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Generate Payroll</h3>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Month</label>
                                <select
                                    value={generateForm.month}
                                    onChange={(e) => setGenerateForm({ ...generateForm, month: parseInt(e.target.value) })}
                                    className="form-input"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>
                                            {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Year</label>
                                <select
                                    value={generateForm.year}
                                    onChange={(e) => setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })}
                                    className="form-input"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowGenerateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleGeneratePayroll}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PayrollHistory;
