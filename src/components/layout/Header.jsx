import React, { useState } from 'react';
import { Search, Bell, User, ChevronDown, LogOut } from 'lucide-react';
import authService from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import toast from 'react-hot-toast';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const user = authService.getCurrentUser();

    const handleLogout = async () => {
        await authService.logout();
        toast.success('Logged out successfully');
        navigate(ROUTES.LOGIN);
    };

    return (
        <header className="header">
            <div className="header-search">
                <Search size={20} className="header-search-icon" />
                <input
                    type="text"
                    placeholder="Search employees, departments..."
                    className="header-search-input"
                />
            </div>

            <div className="header-actions">
                <button className="header-icon-btn">
                    <Bell size={20} />
                    <span className="header-badge">3</span>
                </button>

                <div className="header-profile">
                    <button
                        className="header-profile-btn"
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        <div className="header-profile-avatar">
                            {user?.profilePhoto ? (
                                <img src={user.profilePhoto} alt={user.name} />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <div className="header-profile-info">
                            <span className="header-profile-name">{user?.name || 'Admin'}</span>
                            <span className="header-profile-role">{user?.role || 'Administrator'}</span>
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {showProfileMenu && (
                        <>
                            <div
                                className="header-profile-menu-overlay"
                                onClick={() => setShowProfileMenu(false)}
                            />
                            <div className="header-profile-menu">
                                <div className="header-profile-menu-header">
                                    <div className="header-profile-menu-avatar">
                                        {user?.profilePhoto ? (
                                            <img src={user.profilePhoto} alt={user.name} />
                                        ) : (
                                            <User size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="header-profile-menu-name">{user?.name || 'Admin'}</div>
                                        <div className="header-profile-menu-email">{user?.email || 'admin@arris.com'}</div>
                                    </div>
                                </div>

                                <div className="header-profile-menu-divider" />

                                <button className="header-profile-menu-item" onClick={() => navigate(ROUTES.PROFILE)}>
                                    <User size={16} />
                                    <span>My Profile</span>
                                </button>

                                <button className="header-profile-menu-item" onClick={() => navigate(ROUTES.SETTINGS)}>
                                    <User size={16} />
                                    <span>Settings</span>
                                </button>

                                <div className="header-profile-menu-divider" />

                                <button className="header-profile-menu-item" onClick={handleLogout}>
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
