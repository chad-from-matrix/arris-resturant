import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning' // warning, danger
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div className="confirm-overlay" onClick={onClose} />
            <div className="confirm-dialog">
                <div className="confirm-header">
                    <h3 className="confirm-title">{title}</h3>
                </div>

                <div className="confirm-body">
                    <p className="confirm-message">{message}</p>
                </div>

                <div className="confirm-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn-confirm btn-confirm-${variant}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ConfirmDialog;
