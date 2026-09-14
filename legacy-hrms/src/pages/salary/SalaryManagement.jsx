import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, DollarSign, Users } from 'lucide-react';
import employeeService from '../../services/employeeService';
import salaryStructureService from '../../services/salaryStructureService';
import toast from 'react-hot-toast';
import './SalaryManagement.css';

const SalaryManagement = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [structures, setStructures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [salaryData, setSalaryData] = useState({
        basicSalary: '',
        hra: '',
        conveyance: '',
        specialAllowance: '',
        annualCTC: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, structRes] = await Promise.all([
                employeeService.getEmployees(),
                salaryStructureService.getSalaryStructures(),
            ]);

            if (empRes.success) setEmployees(empRes.data);
            if (structRes.success) setStructures(structRes.data);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleEditSalary = (employee) => {
        setEditingEmployee(employee);
        setSalaryData({
            basicSalary: employee.basicSalary || '',
            hra: employee.hra || '',
            conveyance: employee.conveyance || '',
            specialAllowance: employee.specialAllowance || '',
            annualCTC: employee.annualCTC || '',
        });
        setShowEditModal(true);
    };

    const handleSaveSalary = async () => {
        try {
            const updates = {
                ...salaryData,
                basicSalary: parseFloat(salaryData.basicSalary) || 0,
                hra: parseFloat(salaryData.hra) || 0,
                conveyance: parseFloat(salaryData.conveyance) || 0,
                specialAllowance: parseFloat(salaryData.specialAllowance) || 0,
                annualCTC: parseFloat(salaryData.annualCTC) || 0,
            };

            const response = await employeeService.updateEmployee(editingEmployee.id, updates);

            if (response.success) {
                toast.success('Salary updated successfully');
                setShowEditModal(false);
                loadData();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to update salary');
        }
    };

    const calculateMonthlySalary = (employee) => {
        const basic = employee.basicSalary || 0;
        const hra = employee.hra || 0;
        const conv = employee.conveyance || 0;
        const special = employee.specialAllowance || 0;
        return basic + hra + conv + special;
    };

    const calculateGross = () => {
        const basic = parseFloat(salaryData.basicSalary) || 0;
        const hra = parseFloat(salaryData.hra) || 0;
        const conv = parseFloat(salaryData.conveyance) || 0;
        const special = parseFloat(salaryData.specialAllowance) || 0;
        return basic + hra + conv + special;
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
            <div className="salary-mgmt-loading">
                <div className="loader"></div>
                <p>Loading salary data...</p>
            </div>
        );
    }

    return (
        <div className="salary-management-page">
            <div className="salary-header">
                <div>
                    <h1 className="salary-title">Salary Management</h1>
                    <p className="salary-subtitle">Manage employee salaries and compensation</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => navigate('/salary/structures')}>
                        <DollarSign size={18} />
                        Salary Structures
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/payroll/history')}>
                        <Users size={18} />
                        Payroll History
                    </button>
                </div>
            </div>

            <div className="salary-table-container">
                <table className="salary-table">
                    <thead>
                        <tr>
                            <th>Staff ID</th>
                            <th>Staff Name</th>
                            <th>Designation</th>
                            <th>Basic Salary</th>
                            <th>HRA</th>
                            <th>Conveyance</th>
                            <th>Special Allow.</th>
                            <th>Monthly Gross</th>
                            <th>Annual CTC</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => {
                            const monthlyGross = calculateMonthlySalary(emp);
                            return (
                                <tr key={emp.id}>
                                    <td className="emp-code">{emp.employeeId}</td>
                                    <td className="emp-name">{emp.firstName} {emp.lastName}</td>
                                    <td>{emp.designation}</td>
                                    <td className="amount">{formatCurrency(emp.basicSalary || 0)}</td>
                                    <td className="amount">{formatCurrency(emp.hra || 0)}</td>
                                    <td className="amount">{formatCurrency(emp.conveyance || 0)}</td>
                                    <td className="amount">{formatCurrency(emp.specialAllowance || 0)}</td>
                                    <td className="amount amount-highlight">{formatCurrency(monthlyGross)}</td>
                                    <td className="amount">{formatCurrency(emp.annualCTC || monthlyGross * 12)}</td>
                                    <td>
                                        <button
                                            className="btn-action btn-action-edit"
                                            onClick={() => handleEditSalary(emp)}
                                        >
                                            <Edit2 size={14} />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Edit Salary Modal */}
            {showEditModal && editingEmployee && (
                <>
                    <div className="modal-overlay" onClick={() => setShowEditModal(false)} />
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h3>Edit Salary - {editingEmployee.firstName} {editingEmployee.lastName}</h3>
                            <p className="modal-subtitle">{editingEmployee.employeeId} • {editingEmployee.designation}</p>
                        </div>

                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Basic Salary *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={salaryData.basicSalary}
                                        onChange={(e) => setSalaryData({ ...salaryData, basicSalary: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>HRA (House Rent Allowance) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={salaryData.hra}
                                        onChange={(e) => setSalaryData({ ...salaryData, hra: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Conveyance Allowance *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={salaryData.conveyance}
                                        onChange={(e) => setSalaryData({ ...salaryData, conveyance: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Special Allowance</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={salaryData.specialAllowance}
                                        onChange={(e) => setSalaryData({ ...salaryData, specialAllowance: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Annual CTC</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={salaryData.annualCTC}
                                    onChange={(e) => setSalaryData({ ...salaryData, annualCTC: e.target.value })}
                                />
                            </div>

                            <div className="salary-preview">
                                <div className="preview-row">
                                    <span>Monthly Gross Salary:</span>
                                    <strong>{formatCurrency(calculateGross())}</strong>
                                </div>
                                <div className="preview-row">
                                    <span>Annual CTC (if not specified):</span>
                                    <strong>{formatCurrency(calculateGross() * 12)}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handleSaveSalary}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalaryManagement;
