// Email validation
export const validateEmail = (email) => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }
    return null;
};

// Password validation
export const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return 'Password must contain at least special character (!@#$%^&*)';
    }
    return null;
};

// Password strength indicator
export const getPasswordStrength = (password) => {
    if (!password) return { strength: 'none', score: 0 };

    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Complexity checks
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;

    if (score <= 2) return { strength: 'weak', score, color: 'danger' };
    if (score <= 4) return { strength: 'medium', score, color: 'warning' };
    return { strength: 'strong', score, color: 'success' };
};

// Phone number validation
export const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        return 'Please enter a valid 10-digit phone number';
    }
    return null;
};

// Required field validation
export const validateRequired = (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
    }
    return null;
};

// Number validation
export const validateNumber = (value, fieldName = 'This field') => {
    if (!value) return `${fieldName} is required`;
    if (isNaN(value)) {
        return `${fieldName} must be a valid number`;
    }
    return null;
};

// Positive number validation
export const validatePositiveNumber = (value, fieldName = 'This field') => {
    const numberError = validateNumber(value, fieldName);
    if (numberError) return numberError;
    if (Number(value) <= 0) {
        return `${fieldName} must be a positive number`;
    }
    return null;
};

// Date validation
export const validateDate = (date, fieldName = 'Date') => {
    if (!date) return `${fieldName} is required`;
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        return `${fieldName} is not a valid date`;
    }
    return null;
};

// Future date validation
export const validateFutureDate = (date, fieldName = 'Date') => {
    const dateError = validateDate(date, fieldName);
    if (dateError) return dateError;

    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj < today) {
        return `${fieldName} cannot be in the past`;
    }
    return null;
};

// Past date validation
export const validatePastDate = (date, fieldName = 'Date') => {
    const dateError = validateDate(date, fieldName);
    if (dateError) return dateError;

    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj > today) {
        return `${fieldName} cannot be in the future`;
    }
    return null;
};

// IFSC code validation
export const validateIFSC = (ifsc) => {
    if (!ifsc) return 'IFSC code is required';
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc)) {
        return 'Please enter a valid IFSC code';
    }
    return null;
};

// PAN validation
export const validatePAN = (pan) => {
    if (!pan) return 'PAN is required';
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
        return 'Please enter a valid PAN (e.g., ABCDE1234F)';
    }
    return null;
};

// Aadhar validation
export const validateAadhar = (aadhar) => {
    if (!aadhar) return 'Aadhar is required';
    const aadharRegex = /^[0-9]{12}$/;
    if (!aadharRegex.test(aadhar.replace(/[\s-]/g, ''))) {
        return 'Please enter a valid 12-digit Aadhar number';
    }
    return null;
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
    const errors = {};

    Object.keys(validationRules).forEach(field => {
        const rules = validationRules[field];
        const value = formData[field];

        for (let rule of rules) {
            const error = rule(value);
            if (error) {
                errors[field] = error;
                break; // Stop at first error for this field
            }
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
