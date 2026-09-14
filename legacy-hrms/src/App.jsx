import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ROUTES } from './constants/routes';
import ProtectedRoute from './routes/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import OTPVerification from './pages/auth/OTPVerification';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Layout
import DashboardLayout from './layouts/DashboardLayout';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import Employees from './pages/employees/Employees';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import EmployeeForm from './pages/employees/EmployeeForm';
import Attendance from './pages/attendance/Attendance';
import AttendanceDetail from './pages/attendance/AttendanceDetail';
import PayrollHistory from './pages/payroll/PayrollHistory';
import PayrollDetail from './pages/payroll/PayrollDetail';
import SalaryPayroll from './pages/payroll/SalaryPayroll';
import SalaryStructures from './pages/salary/SalaryStructures';
import SalaryManagement from './pages/salary/SalaryManagement';
import Sites from './pages/organization/Sites';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.OTP_VERIFICATION} element={<OTPVerification />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/new" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance/:employeeId" element={<AttendanceDetail />} />
          <Route path="salary/management" element={<SalaryManagement />} />
          <Route path="salary/structures" element={<SalaryStructures />} />
          <Route path="payroll/salary-structure" element={<SalaryPayroll />} />
          <Route path="payroll/history" element={<PayrollHistory />} />
          <Route path="payroll/details/:year/:month" element={<PayrollDetail />} />
          <Route path="organization/sites" element={<Sites />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
