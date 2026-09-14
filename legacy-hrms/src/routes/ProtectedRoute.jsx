import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';
import { ROUTES } from '../constants/routes';

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return children;
};

export default ProtectedRoute;
