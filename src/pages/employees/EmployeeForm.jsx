import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import employeeService from '../../services/employeeService';
import departmentService from '../../services/departmentService';
import siteService from '../../services/siteService';
import toast from 'react-hot-toast';
import './EmployeeForm.css';

const EmployeeForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = id && id !== 'new';

    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [sites, setSites] = useState([]);
    const [formData, setFormData] = useState({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: 'male',
        maritalStatus: 'single',
        address: '',
        city: '',
        state: '',
        pincode: '',
        nationality: 'Indian',
        department: '',
        designation: '',
        site: '',
        joiningDate: '',
        employmentType: 'full-time',
        status: 'active',
        reportingManager: '',
        annualCTC: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
    });

    useEffect(() => {
        loadFormData();
    }, [id]);

    const loadFormData = async () => {
        try {
            setLoading(true);

            // Load departments and sites
            const [deptRes, siteRes] = await Promise.all([
                departmentService.getDepartments(),
                siteService.getSites(),
            ]);

            if (deptRes.success) setDepartments(deptRes.data);
            if (siteRes.success) setSites(siteRes.data);

            // Load employee data if editing
            if (isEdit) {
                const response = await employeeService.getEmployee(id);
                if (response.success) {
                    setFormData(response.data);
                } else {
                    toast.error('Employee not found');
                    navigate('/employees');
                }
            } else {
                // Generate employee ID for new employee
                setFormData(prev => ({
                    ...prev,
                    employeeId: `ARR${Date.now().toString().slice(-3)}`,
                }));
            }
        } catch (error) {
            toast.error('Failed to load form data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.email) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);

            let response;
            if (isEdit) {
                response = await employeeService.updateEmployee(id, formData);
            } else {
                response = await employeeService.createEmployee(formData);
            }

            if (response.success) {
                toast.success(response.message);
                navigate('/employees');
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error(isEdit ? 'Failed to update employee' : 'Failed to create employee');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEdit) {
        return (
            <div className="form-loading">
                <div className="loader"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="employee-form-page">
            <div className="form-header">
                <button className="btn-back" onClick={() => navigate('/employees')}>
                    <ArrowLeft size={20} />
                    Back to Staff List
                </button>
                <h1 className="form-title">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h1>
            </div>

            <form className="employee-form" onSubmit={handleSubmit}>
                {/* Personal Information */}
                <div className="form-section">
                    <h2 className="section-title">Personal Information</h2>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Employee ID *</label>
                            <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                required
                                disabled={isEdit}
                            />
                        </div>

                        <div className="form-field">
                            <label>First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Date of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Marital Status</label>
                            <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                                <option value="divorced">Divorced</option>
                                <option value="widowed">Widowed</option>
                            </select>
                        </div>

                        <div className="form-field form-field-full">
                            <label>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>State</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Professional Information */}
                <div className="form-section">
                    <h2 className="section-title">Professional Information</h2>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Department *</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Designation *</label>
                            <input
                                type="text"
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Branch/Site *</label>
                            <select
                                name="site"
                                value={formData.site}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Site</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.name}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Joining Date *</label>
                            <input
                                type="date"
                                name="joiningDate"
                                value={formData.joiningDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Employment Type</label>
                            <select name="employmentType" value={formData.employmentType} onChange={handleChange}>
                                <option value="full-time">Full Time</option>
                                <option value="part-time">Part Time</option>
                                <option value="contract">Contract</option>
                                <option value="intern">Intern</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Status</label>
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Reporting Manager</label>
                            <input
                                type="text"
                                name="reportingManager"
                                value={formData.reportingManager}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Payroll Information */}
                <div className="form-section">
                    <h2 className="section-title">Payroll Information</h2>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Annual CTC</label>
                            <input
                                type="number"
                                name="annualCTC"
                                value={formData.annualCTC}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Bank Name</label>
                            <input
                                type="text"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Account Number</label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>IFSC Code</label>
                            <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => navigate('/employees')}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Saving...' : (isEdit ? 'Update Employee' : 'Create Employee')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EmployeeForm;
