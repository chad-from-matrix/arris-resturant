import React from 'react';
import './Button.css';

const Button = ({
    children,
    variant = 'primary', // primary, secondary, outline, danger, ghost
    size = 'md', // sm, md, lg
    fullWidth = false,
    disabled = false,
    loading = false,
    icon = null,
    onClick,
    type = 'button',
    className = '',
}) => {
    const buttonClasses = `btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full-width' : ''} ${className}`;

    return (
        <button
            type={type}
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? (
                <span className="btn-loader"></span>
            ) : (
                <>
                    {icon && <span className="btn-icon">{icon}</span>}
                    <span>{children}</span>
                </>
            )}
        </button>
    );
};

export default Button;
