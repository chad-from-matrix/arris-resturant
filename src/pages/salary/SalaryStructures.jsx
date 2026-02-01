import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import salaryStructureService from '../../services/salaryStructureService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import './SalaryStructures.css';

const SalaryStructures = () => {
    const navigate = useNavigate();
    const [structures, setStructures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
    const [formData, setFormData] = useState({
        name: '',
        basicSalary: '',
        hra: '',
        conveyance: '',
        specialAllowance: '',
        description: '',
    });

    useEffect(() => {
        loadStructures();
    }, []);

    const loadStructures = async () => {
        try {
            setLoading(true);
            const response = await salaryStructureService.getSalaryStructures();
            if (response.success) {
                setStructures(response.data);
            }
        } catch (error) {
            toast.error('Failed to load salary structures');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (structure = null) => {
        if (structure) {
            setEditingId(structure.id);
            setFormData({
                name: structure.name,
                basicSalary: structure.basicSalary,
                hra: structure.hra,
                conveyance: structure.conveyance,
                specialAllowance: structure.specialAllowance || '',
                description: structure.description || '',
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                basicSalary: '',
                hra: '',
                conveyance: '',
                specialAllowance: '',
                description: '',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({
            name: '',
            basicSalary: '',
            hra: '',
            conveyance: '',
            specialAllowance: '',
            description: '',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const data = {
                ...formData,
                basicSalary: parseFloat(formData.basicSalary),
                hra: parseFloat(formData.hra),
                conveyance: parseFloat(formData.conveyance),
                specialAllowance: parseFloat(formData.specialAllowance) || 0,
            };

            let response;
            if (editingId) {
                response = await salaryStructureService.updateSalaryStructure(editingId, data);
            } else {
                response = await salaryStructureService.createSalaryStructure(data);
            }

            if (response.success) {
                toast.success(response.message);
                handleCloseModal();
                loadStructures();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to save salary structure');
        }
    };

    const handleDelete = (structure) => {
        setDeleteConfirm({
            isOpen: true,
            id: structure.id,
            name: structure.name,
        });
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await salaryStructureService.deleteSalaryStructure(deleteConfirm.id);
            if (response.success) {
                toast.success('Salary structure deleted successfully');
                loadStructures();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to delete salary structure');
        }
    };

    const calculateGross = () => {
        const basic = parseFloat(formData.basicSalary) || 0;
        const hra = parseFloat(formData.hra) || 0;
        const conv = parseFloat(formData.conveyance) || 0;
        const special = parseFloat(formData.specialAllowance) || 0;
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
            <div className="structures-loading">
                <div className="loader"></div>
                <p>Loading salary structures...</p>
            </div>
        );
    }

    return (
        <div className="salary-structures-page">
            <div className="structures-header">
                <div>
                    <h1 className="structures-title">Salary Structures</h1>
                    <p className="structures-subtitle">Manage salary templates and components</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Add Structure
                </button>
            </div>

            <div className="structures-grid">
                {structures.map(structure => {
                    const gross = salaryStructureService.calculateGross(structure);
                    return (
                        <div key={structure.id} className="structure-card">
                            <div className="structure-header">
                                <h3 className="structure-name">{structure.name}</h3>
                                <div className="structure-actions">
                                    <button
                                        className="action-btn action-btn-edit"
                                        onClick={() => handleOpenModal(structure)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn action-btn-delete"
                                        onClick={() => handleDelete(structure)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {structure.description && (
                                <p className="structure-description">{structure.description}</p>
                            )}

                            <div className="structure-details">
                                <div className="detail-row">
                                    <span>Basic Salary</span>
                                    <span className="detail-value">{formatCurrency(structure.basicSalary)}</span>
                                </div>
                                <div className="detail-row">
                                    <span>HRA</span>
                                    <span className="detail-value">{formatCurrency(structure.hra)}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Conveyance</span>
                                    <span className="detail-value">{formatCurrency(structure.conveyance)}</span>
                                </div>
                                {structure.specialAllowance > 0 && (
                                    <div className="detail-row">
                                        <span>Special Allowance</span>
                                        <span className="detail-value">{formatCurrency(structure.specialAllowance)}</span>
                                    </div>
                                )}
                                <div className="detail-row detail-row-total">
                                    <span>Gross Salary</span>
                                    <span className="detail-value">{formatCurrency(gross)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {structures.length === 0 && (
                <div className="structures-empty">
                    <p>No salary structures found</p>
                    <button className="btn-primary" onClick={() => handleOpenModal()}>
                        Create First Structure
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <>
                    <div className="modal-overlay" onClick={handleCloseModal} />
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editingId ? 'Edit Salary Structure' : 'Add Salary Structure'}</h3>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Structure Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Basic Salary *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.basicSalary}
                                            onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>HRA *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.hra}
                                            onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Conveyance *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.conveyance}
                                            onChange={(e) => setFormData({ ...formData, conveyance: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Special Allowance</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.specialAllowance}
                                            onChange={(e) => setFormData({ ...formData, specialAllowance: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="gross-preview">
                                    <strong>Gross Salary:</strong>
                                    <span>{formatCurrency(calculateGross())}</span>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
                onConfirm={handleDeleteConfirm}
                title="Delete Salary Structure"
                message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
};

export default SalaryStructures;
