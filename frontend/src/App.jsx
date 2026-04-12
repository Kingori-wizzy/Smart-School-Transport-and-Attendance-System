import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardProvider } from './context/DashboardContext';
import Login from './pages/Login/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import './assets/styles/index.css';
import TransportStudents from './pages/Students/TransportStudents';
import SMSDashboard from './pages/Admin/SMSDashboard';
import MessagingDashboard from './pages/Admin/MessagingDashboard';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const AttendancePage = lazy(() => import('./pages/Attendance/AttendancePage'));
const TransportPage = lazy(() => import('./pages/Transport/TransportPage'));
const AnalyticsDashboard = lazy(() => import('./pages/Analytics/AnalyticsDashboard'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const Notifications = lazy(() => import('./components/Parent/Notifications'));

function App() {
  // Listen for auth changes from AuthContext
  useEffect(() => {
    const handleAuthChange = (event) => {
      console.log('Auth change detected in App:', event.detail);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <DashboardProvider>
              <Suspense fallback={
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh'
                }}>
                  <LoadingSpinner size="large" text="Loading..." />
                </div>
              }>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/attendance" 
                    element={
                      <ProtectedRoute>
                        <AttendancePage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/transport" 
                    element={
                      <ProtectedRoute>
                        <TransportPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/students/transport" 
                    element={
                      <ProtectedRoute>
                        <TransportStudents />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/analytics" 
                    element={
                      <ProtectedRoute>
                        <AnalyticsDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/reports" 
                    element={
                      <ProtectedRoute>
                        <ReportsPage />
                      </ProtectedRoute>
                    } 
                  />
                  {/* SMS Dashboard Route */}
                  <Route 
                    path="/sms" 
                    element={
                      <ProtectedRoute>
                        <SMSDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Messaging Dashboard Route */}
                  <Route 
                    path="/messaging" 
                    element={
                      <ProtectedRoute>
                        <MessagingDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Parent Notifications Route */}
                  <Route 
                    path="/notifications" 
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </DashboardProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;