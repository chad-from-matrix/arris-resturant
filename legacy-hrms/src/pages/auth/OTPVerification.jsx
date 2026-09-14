import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import { ROUTES } from '../../constants/routes';
import toast from 'react-hot-toast';
import './Auth.css';

const OTPVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Start countdown timer
        const timer = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleChange = (index, value) => {
        if (value.length > 1) value = value[0];

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter complete OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await authService.verifyOTP(otpString);

            if (response.success) {
                toast.success(response.message);
                navigate(ROUTES.RESET_PASSWORD);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        const email = location.state?.email;
        if (!email) {
            toast.error('Email not found. Please start again.');
            navigate(ROUTES.FORGOT_PASSWORD);
            return;
        }

        try {
            await authService.forgotPassword(email);
            toast.success('OTP resent successfully');
            setResendTimer(60);
            setOtp(['', '', '', '', '', '']);
        } catch (error) {
            toast.error('Failed to resend OTP');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Enter OTP</h1>
                    <p className="auth-description">
                        We've sent a 6-digit code to {location.state?.email || 'your email'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="otp-inputs">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="otp-input"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                    >
                        Verify OTP
                    </Button>

                    <div className="otp-resend">
                        {resendTimer > 0 ? (
                            <p>Resend OTP in {resendTimer}s</p>
                        ) : (
                            <button type="button" className="auth-link" onClick={handleResend}>
                                Resend OTP
                            </button>
                        )}
                    </div>

                    <div className="auth-demo-info" style={{ marginTop: '1rem' }}>
                        <p><strong>Demo OTP:</strong> 123456</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OTPVerification;
