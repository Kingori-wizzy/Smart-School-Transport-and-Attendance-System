import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import EnhancedAnalytics from '../../components/Analytics/EnhancedAnalytics';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <Sidebar />
      
      <div className="main-content">
        <div className="top-bar">
          <h2>Analytics Dashboard</h2>
          <div className="user-info">
            <span className="welcome-text">
              Welcome, {user?.name || user?.email || 'Admin'}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="content-area">
          <EnhancedAnalytics />
        </div>
      </div>
    </div>
  );
}