import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, Briefcase, DollarSign } from 'lucide-react';
import employeeService from '../../services/employeeService';
import Tag from '../../components/common/Tag';
import toast from 'react-hot-toast';
import './EmployeeProfile.css';

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal');

    useEffect(() => {
        loadEmployee();
    }, [id]);

    const loadEmployee = async () => {
        try {
            setLoading(true);
            const response = await employeeService.getEmployee(id);
            if (response.success) {
                setEmployee(response.data);
            } else {
                toast.error('Employee not found');
                navigate('/employees');
            }
        } catch (error) {
            toast.error('Failed to load employee');
            navigate('/employees');
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="loader"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    if (!employee) {
        return null;
    }

    return (
        <div className="employee-profile">
            <div className="profile-header">
                <button className="btn-back" onClick={() => navigate('/employees')}>
                    <ArrowLeft size={20} />
                    Back to Staff List
                </button>

                <button className="btn-edit" onClick={() => navigate(`/employees/${id}/edit`)}>
                    <Edit2 size={18} />
                    Edit Profile
                </button>
            </div>

            <div className="profile-card">
                <div className="profile-main">
                    <div className="profile-avatar-large">
                        {getInitials(employee.firstName, employee.lastName)}
                    </div>

                    <div className="profile-info">
                        <h1 className="profile-name">{employee.firstName} {employee.lastName}</h1>
                        <p className="profile-designation">{employee.designation} • {employee.department}</p>
                        <div className="profile-meta">
                            <Tag color={employee.status === 'active' ? 'success' : 'danger'}>
                                {employee.status}
                            </Tag>
                            <span className="profile-id">{employee.employeeId}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-tabs">
                    <button
                        className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('personal')}
                    >
                        Personal Info
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'professional' ? 'active' : ''}`}
                        onClick={() => setActiveTab('professional')}
                    >
                        Professional
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'payroll' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payroll')}
                    >
                        Payroll Info
                    </button>
                </div>

                <div className="profile-content">
                    {activeTab === 'personal' && (
                        <div className="tab-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-label">
                                        <Mail size={16} />
                                        Email
                                    </div>
                                    <div className="info-value">{employee.email}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">
                                        <Phone size={16} />
                                        Phone
                                    </div>
                                    <div className="info-value">{employee.phone}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">
                                        <Calendar size={16} />
                                        Date of Birth
                                    </div>
                                    <div className="info-value">
                                        {new Date(employee.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Gender</div>
                                    <div className="info-value" style={{ textTransform: 'capitalize' }}>{employee.gender}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Marital Status</div>
                                    <div className="info-value" style={{ textTransform: 'capitalize' }}>{employee.maritalStatus}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Nationality</div>
                                    <div className="info-value">{employee.nationality}</div>
                                </div>

                                <div className="info-item info-item-full">
                                    <div className="info-label">
                                        <MapPin size={16} />
                                        Address
                                    </div>
                                    <div className="info-value">
                                        {employee.address}, {employee.city}, {employee.state} - {employee.pincode}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="tab-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-label">
                                        <Briefcase size={16} />
                                        Designation
                                    </div>
                                    <div className="info-value">{employee.designation}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Department</div>
                                    <div className="info-value">{employee.department}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Branch/Site</div>
                                    <div className="info-value">{employee.site}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">
                                        <Calendar size={16} />
                                        Joining Date
                                    </div>
                                    <div className="info-value">
                                        {new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Employment Type</div>
                                    <div className="info-value" style={{ textTransform: 'capitalize' }}>{employee.employmentType}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Reporting Manager</div>
                                    <div className="info-value">{employee.reportingManager}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payroll' && (
                        <div className="tab-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-label">
                                        <DollarSign size={16} />
                                        Annual CTC
                                    </div>
                                    <div className="info-value">₹{employee.annualCTC?.toLocaleString('en-IN')}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Bank Name</div>
                                    <div className="info-value">{employee.bankName}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">Account Number</div>
                                    <div className="info-value">{employee.accountNumber}</div>
                                </div>

                                <div className="info-item">
                                    <div className="info-label">IFSC Code</div>
                                    <div className="info-value">{employee.ifscCode}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfile;
