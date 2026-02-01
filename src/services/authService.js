import { STORAGE_KEYS } from '../constants/config';
import { getItem, setItem, removeItem } from '../utils/storage';
import { MOCK_API_DELAY } from '../constants/config';

// Mock user credentials
const MOCK_CREDENTIALS = {
    email: 'admin@arris.com',
    password: 'Admin@123',
};

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Authentication Service
const authService = {
    // Login
    async login(email, password) {
        await delay(MOCK_API_DELAY);

        if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
            const user = {
                id: 'user-001',
                name: 'Admin User',
                email: email,
                role: 'admin',
                profilePhoto: 'https://i.pravatar.cc/150?img=68',
            };

            const token = 'mock-jwt-token-' + Date.now();

            setItem(STORAGE_KEYS.AUTH_TOKEN, token);
            setItem(STORAGE_KEYS.USER_DATA, user);

            return {
                success: true,
                data: { user, token },
                message: 'Login successful',
            };
        } else {
            return {
                success: false,
                message: 'Invalid email or password',
            };
        }
    },

    // Forgot Password
    async forgotPassword(email) {
        await delay(MOCK_API_DELAY);

        if (email) {
            // In real app, send OTP to email
            return {
                success: true,
                message: 'OTP sent to your email',
                data: { email },
            };
        } else {
            return {
                success: false,
                message: 'Please provide a valid email',
            };
        }
    },

    // Verify OTP
    async verifyOTP(otp) {
        await delay(MOCK_API_DELAY);

        // Mock OTP is '123456'
        if (otp === '123456') {
            return {
                success: true,
                message: 'OTP verified successfully',
                data: { verified: true },
            };
        } else {
            return {
                success: false,
                message: 'Invalid OTP',
            };
        }
    },

    // Reset Password
    async resetPassword(newPassword) {
        await delay(MOCK_API_DELAY);

        if (newPassword) {
            // In real app, update password in database
            return {
                success: true,
                message: 'Password reset successful',
            };
        } else {
            return {
                success: false,
                message: 'Please provide a valid password',
            };
        }
    },

    // Logout
    async logout() {
        await delay(300);

        removeItem(STORAGE_KEYS.AUTH_TOKEN);
        removeItem(STORAGE_KEYS.USER_DATA);

        return {
            success: true,
            message: 'Logged out successfully',
        };
    },

    // Get current user
    getCurrentUser() {
        return getItem(STORAGE_KEYS.USER_DATA);
    },

    // Check if authenticated
    isAuthenticated() {
        const token = getItem(STORAGE_KEYS.AUTH_TOKEN);
        return !!token;
    },

    // Get auth token
    getToken() {
        return getItem(STORAGE_KEYS.AUTH_TOKEN);
    },
};

export default authService;
