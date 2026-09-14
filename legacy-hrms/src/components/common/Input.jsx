import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

const Input = ({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    icon = null,
    className = '',
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
        <div className={`input-group ${className}`}>
            {label && (
                <label className="input-label" htmlFor={name}>
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <div className="input-wrapper">
                {icon && <span className="input-icon-left">{icon}</span>}
                <input
                    type={inputType}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`input ${icon ? 'input-with-icon-left' : ''} ${isPassword ? 'input-with-icon-right' : ''} ${error ? 'input-error' : ''}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="input-icon-right"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
            {error && <span className="input-error-message">{error}</span>}
        </div>
    );
};

export default Input;
