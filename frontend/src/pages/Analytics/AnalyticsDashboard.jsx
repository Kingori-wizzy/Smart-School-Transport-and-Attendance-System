import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import EnhancedAnalytics from '../../components/Analytics/EnhancedAnalytics';
import { analyticsService } from '../../services/analytics';
import toast from 'react-hot-toast';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardData();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchAnalyticsData();
    toast.success('Analytics data refreshed');
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
            <button onClick={handleRefresh} className="refresh-btn" style={{
              padding: '8px 15px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}>
              🔄 Refresh
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="content-area">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div className="loading-spinner" />
              <p style={{ marginTop: '20px', color: '#666' }}>Loading analytics data...</p>
            </div>
          ) : (
            <EnhancedAnalytics data={analyticsData} />
          )}
        </div>
      </div>
    </div>
  );
}