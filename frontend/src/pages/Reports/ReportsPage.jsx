/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import ReportGenerator from '../../components/Reports/ReportGenerator';
import ReportViewer from '../../components/Reports/ReportViewer';
import { reportService } from '../../services/report';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'generate', name: 'Generate Report', icon: '📊', description: 'Create new reports with custom parameters' },
    { id: 'saved', name: 'Saved Reports', icon: '📁', description: 'View and manage previously saved reports' }
  ];

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedReports();
    }
  }, [activeTab]);

  const fetchSavedReports = async () => {
    try {
      setLoading(true);
      const reports = await reportService.getSavedReports();
      setSavedReports(reports.data || []);
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      toast.error('Failed to load saved reports');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleReportGenerated = () => {
    toast.success('Report generated successfully');
    // Optionally switch to saved tab
    // setActiveTab('saved');
  };

  const handleDeleteReport = async (reportId) => {
    try {
      await reportService.deleteReport(reportId);
      toast.success('Report deleted');
      fetchSavedReports();
    } catch (error) {
      toast.error('Failed to delete report');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      
      <div className="main-content">
        <div className="top-bar">
          <h2>Reports Management</h2>
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
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginBottom: '25px'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '15px 30px',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' : 'white',
                  color: activeTab === tab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '16px',
                  fontWeight: '500',
                  boxShadow: activeTab === tab.id ? '0 4px 15px rgba(33, 150, 243, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div>{tab.name}</div>
                  <div style={{ 
                    fontSize: '12px', 
                    opacity: 0.8,
                    display: activeTab === tab.id ? 'block' : 'none'
                  }}>
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            minHeight: '600px',
            padding: '20px'
          }}>
            {activeTab === 'generate' && (
              <ReportGenerator onReportGenerated={handleReportGenerated} />
            )}
            {activeTab === 'saved' && (
              <ReportViewer 
                reports={savedReports} 
                loading={loading}
                onDelete={handleDeleteReport}
                onRefresh={fetchSavedReports}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}