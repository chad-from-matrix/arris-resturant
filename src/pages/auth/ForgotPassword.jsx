import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import { ROUTES } from '../../constants/routes';
import toast from 'react-hot-toast';
import './Auth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        setLoading(true);
        try {
            const response = await authService.forgotPassword(email);

            if (response.success) {
                toast.success(response.message);
                navigate(ROUTES.OTP_VERIFICATION, { state: { email } });
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
                    <h1 className="auth-title">Forgot Password</h1>
                    <p className="auth-description">Enter your email to receive an OTP</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@arris.com"
                        icon={<Mail size={20} />}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                    >
                        Send OTP
                    </Button>
                </form>

                <button
                    className="auth-link"
                    onClick={() => navigate(ROUTES.LOGIN)}
                >
                    <ArrowLeft size={16} style={{ marginRight: 4 }} />
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;
