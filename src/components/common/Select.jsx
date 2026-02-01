import React from 'react';
import './Select.css';

const Select = ({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    error,
    required = false,
    disabled = false,
    className = '',
}) => {
    return (
        <div className={`select-group ${className}`}>
            {label && (
                <label className="select-label" htmlFor={name}>
                    {label}
                    {required && <span className="select-required">*</span>}
                </label>
            )}
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`select ${error ? 'select-error' : ''}`}
            >
                <option value="">{placeholder}</option>
                {options.map((option, index) => (
                    <option key={index} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <span className="select-error-message">{error}</span>}
        </div>
    );
};

export default Select;
