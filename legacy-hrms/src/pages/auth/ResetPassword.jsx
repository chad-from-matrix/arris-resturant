import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import { ROUTES } from '../../constants/routes';
import { validatePassword, getPasswordStrength } from '../../utils/validators';
import toast from 'react-hot-toast';
import './Auth.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ strength: 'none', score: 0 });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Update password strength
        if (name === 'newPassword') {
            setPasswordStrength(getPasswordStrength(value));
        }

        // Clear errors
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        const passwordError = validatePassword(formData.newPassword);
        if (passwordError) {
            newErrors.newPassword = passwordError;
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        try {
            const response = await authService.resetPassword(formData.newPassword);

            if (response.success) {
                toast.success('Password reset successful! Redirecting to login...');
                setTimeout(() => {
                    navigate(ROUTES.LOGIN);
                }, 2000);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-description">Create a new strong password</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <Input
                        label="New Password"
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="Enter new password"
                        error={errors.newPassword}
                        icon={<Lock size={20} />}
                        required
                    />

                    {formData.newPassword && (
                        <div className="password-strength">
                            <div className={`password-strength-bar password-strength-${passwordStrength.strength}`}></div>
                        </div>
                    )}
                    {formData.newPassword && (
                        <div className="password-strength-label">
                            Password strength: <strong style={{ textTransform: 'capitalize' }}>{passwordStrength.strength}</strong>
                        </div>
                    )}

                    <Input
                        label="Confirm Password"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm new password"
                        error={errors.confirmPassword}
                        icon={<Lock size={20} />}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                    >
                        Reset Password
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
