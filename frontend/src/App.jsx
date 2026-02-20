import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardProvider } from './context/DashboardContext';
import Login from './pages/Login/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import './assets/styles/index.css';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const AttendancePage = lazy(() => import('./pages/Attendance/AttendancePage'));
const TransportPage = lazy(() => import('./pages/Transport/TransportPage'));
const AnalyticsDashboard = lazy(() => import('./pages/Analytics/AnalyticsDashboard'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));

function App() {
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