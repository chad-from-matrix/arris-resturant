import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import employeeService from '../../services/employeeService';
import Tag from '../../components/common/Tag';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './Employees.css';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, employeeId: null, employeeName: '' });

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        filterEmployees();
    }, [searchQuery, employees]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const response = await employeeService.getEmployees();
            if (response.success) {
                setEmployees(response.data);
                setFilteredEmployees(response.data);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const filterEmployees = () => {
        if (!searchQuery.trim()) {
            setFilteredEmployees(employees);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = employees.filter(emp =>
            emp.firstName?.toLowerCase().includes(query) ||
            emp.lastName?.toLowerCase().includes(query) ||
            emp.employeeId?.toLowerCase().includes(query) ||
            emp.department?.toLowerCase().includes(query) ||
            emp.designation?.toLowerCase().includes(query)
        );
        setFilteredEmployees(filtered);
    };

    const getStatusColor = (status) => {
        return status === 'active' ? 'success' : 'danger';
    };

    const getEmploymentTypeColor = (type) => {
        const colors = {
            'full-time': 'primary',
            'part-time': 'warning',
            intern: 'info',
            contract: 'secondary',
        };
        return colors[type] || 'secondary';
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const handleToggleStatus = async (employee) => {
        try {
            const response = await employeeService.toggleEmployeeStatus(employee.id);
            if (response.success) {
                toast.success(response.message);
                loadEmployees();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteClick = (employee) => {
        setDeleteConfirm({
            isOpen: true,
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
        });
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await employeeService.deleteEmployee(deleteConfirm.employeeId);
            if (response.success) {
                toast.success('Employee deleted successfully');
                loadEmployees();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to delete employee');
        }
    };

    const handleRowClick = (employeeId) => {
        navigate(`/employees/${employeeId}`);
    };

    if (loading) {
        return (
            <div className="employees-loading">
                <div className="loader"></div>
                <p>Loading staff...</p>
            </div>
        );
    }

    return (
        <div className="employees-page">
            <div className="employees-header">
                <div>
                    <h1 className="employees-title">Staff Management</h1>
                    <p className="employees-subtitle">Manage restaurant staff and their information</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/employees/new')}>
                    <Plus size={20} />
                    Add Staff
                </button>
            </div>

            <div className="employees-toolbar">
                <div className="employees-search">
                    <input
                        type="text"
                        placeholder="Search by name, ID, role, department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="employees-table-container">
                <table className="employees-table">
                    <thead>
                        <tr>
                            <th>Staff ID</th>
                            <th>Staff Member</th>
                            <th>Department/Role</th>
                            <th>Branch</th>
                            <th>Joining Date</th>
                            <th>Employment Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(employee => (
                            <tr key={employee.id} onClick={() => handleRowClick(employee.id)} style={{ cursor: 'pointer' }}>
                                <td className="emp-id">{employee.employeeId}</td>
                                <td>
                                    <div className="emp-name-cell">
                                        <div className="emp-avatar">
                                            {getInitials(employee.firstName, employee.lastName)}
                                        </div>
                                        <div className="emp-name-info">
                                            <div className="emp-name">{employee.firstName} {employee.lastName}</div>
                                            <div className="emp-email">{employee.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="emp-dept-cell">
                                        <div className="emp-dept">{employee.department}</div>
                                        <div className="emp-designation">{employee.designation}</div>
                                    </div>
                                </td>
                                <td>{employee.site}</td>
                                <td>{new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td>
                                    <Tag color={getEmploymentTypeColor(employee.employmentType)}>
                                        {employee.employmentType}
                                    </Tag>
                                </td>
                                <td>
                                    <Tag color={getStatusColor(employee.status)}>
                                        {employee.status}
                                    </Tag>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <div className="action-buttons">
                                        <button
                                            className="action-btn action-btn-edit"
                                            onClick={() => navigate(`/employees/${employee.id}/edit`)}
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn action-btn-toggle"
                                            onClick={() => handleToggleStatus(employee)}
                                            title={employee.status === 'active' ? 'Deactivate' : 'Activate'}
                                        >
                                            {employee.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        </button>
                                        <button
                                            className="action-btn action-btn-delete"
                                            onClick={() => handleDeleteClick(employee)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredEmployees.length === 0 && (
                    <div className="employees-empty">
                        <p>No staff members found</p>
                    </div>
                )}
            </div>

            <div className="employees-summary">
                Showing {filteredEmployees.length} of {employees.length} staff members
            </div>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, employeeId: null, employeeName: '' })}
                onConfirm={handleDeleteConfirm}
                title="Delete Employee"
                message={`Are you sure you want to delete ${deleteConfirm.employeeName}? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
};

export default Employees;
