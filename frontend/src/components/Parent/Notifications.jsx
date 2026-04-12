/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    byType: {}
  });
  const [socket, setSocket] = useState(null);

  const itemsPerPage = 20;

  // Notification type icons and colors (using text instead of emojis)
  const notificationConfig = {
    boarding_alert: { icon: '[BUS]', color: '#4CAF50', label: 'Boarded' },
    alighting_alert: { icon: '[HOME]', color: '#FF9800', label: 'Dropped Off' },
    trip_start: { icon: '[START]', color: '#2196F3', label: 'Trip Started' },
    trip_complete: { icon: '[END]', color: '#9C27B0', label: 'Trip Completed' },
    trip_cancelled: { icon: '[CANCEL]', color: '#f44336', label: 'Trip Cancelled' },
    admin_broadcast: { icon: '[ANNOUNCE]', color: '#607D8B', label: 'Announcement' },
    attendance_alert: { icon: '[ATTEND]', color: '#FF5722', label: 'Attendance' },
    emergency: { icon: '[ALERT]', color: '#f44336', label: 'Emergency' },
    default: { icon: '[NOTE]', color: '#999', label: 'Notification' }
  };

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    setupSocketConnection();
    return () => {
      if (socket) socket.disconnect();
    };
  }, [currentPage, fetchNotifications, filterType, socket]);

  const setupSocketConnection = () => {
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for notifications');
    });

    newSocket.on('new-notification', (notification) => {
      console.log('New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast.success(notification.title, {
        duration: 4000,
        position: 'top-right'
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/notifications?page=${currentPage}&limit=${itemsPerPage}&type=${filterType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data);
        setTotalPages(data.pagination?.pages || 1);
        setUnreadCount(data.pagination?.unread || 0);
      } else {
        toast.error(data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(prev => prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success('Marked as read');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date() })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (selectedNotification?._id === notificationId) {
          setSelectedNotification(null);
        }
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/notifications/clear/all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications([]);
        setSelectedNotification(null);
        setUnreadCount(0);
        toast.success('All notifications cleared');
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const getNotificationConfig = (type) => {
    return notificationConfig[type] || notificationConfig.default;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const getFilterOptions = () => {
    const options = [
      { value: 'all', label: 'All Notifications', count: stats.total },
      { value: 'unread', label: 'Unread', count: stats.unread },
      { value: 'boarding_alert', label: 'Boarding', count: stats.byType?.boarding_alert || 0 },
      { value: 'alighting_alert', label: 'Alighting', count: stats.byType?.alighting_alert || 0 },
      { value: 'trip_start', label: 'Trip Started', count: stats.byType?.trip_start || 0 },
      { value: 'trip_complete', label: 'Trip Completed', count: stats.byType?.trip_complete || 0 },
      { value: 'admin_broadcast', label: 'Announcements', count: stats.byType?.admin_broadcast || 0 }
    ];
    return options;
  };

  if (loading && notifications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2196F3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <p style={{ marginTop: '16px', color: '#666' }}>Loading notifications...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '12px',
                background: '#f44336',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '14px'
              }}>
                {unreadCount} new
              </span>
            )}
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            Stay updated with your child's transport status
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                padding: '10px 20px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              style={{
                padding: '10px 20px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.total || 0}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Notifications</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.unread || 0}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Unread</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.byType?.boarding_alert || 0}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Boarding Alerts</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.byType?.alighting_alert || 0}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Alighting Alerts</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {getFilterOptions().map(option => (
          <button
            key={option.value}
            onClick={() => {
              setFilterType(option.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 20px',
              background: filterType === option.value ? '#2196F3' : '#f5f5f5',
              color: filterType === option.value ? 'white' : '#666',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {option.label}
            {option.count > 0 && (
              <span style={{
                marginLeft: '8px',
                background: filterType === option.value ? 'rgba(255,255,255,0.2)' : '#ddd',
                padding: '2px 6px',
                borderRadius: '12px',
                fontSize: '11px'
              }}>
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', color: '#ccc' }}>🔔</div>
          <h3 style={{ marginBottom: '8px', color: '#333' }}>No notifications</h3>
          <p style={{ color: '#666' }}>
            {filterType !== 'all' 
              ? `No ${filterType.replace('_', ' ')} notifications found`
              : 'You have no notifications at this time'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map(notification => {
              const config = getNotificationConfig(notification.type);
              const isUnread = !notification.isRead;
              
              return (
                <div
                  key={notification._id}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                  style={{
                    background: isUnread ? '#e3f2fd' : 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    borderLeft: `4px solid ${config.color}`,
                    cursor: isUnread ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      minWidth: '70px',
                      textAlign: 'center',
                      background: config.color,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {config.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div>
                          <h4 style={{
                            margin: 0,
                            fontSize: '16px',
                            color: '#333',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            {notification.title}
                            {notification.type === 'emergency' && (
                              <span style={{
                                background: '#f44336',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px'
                              }}>
                                URGENT
                              </span>
                            )}
                            <span style={{
                              background: config.color,
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px'
                            }}>
                              {config.label}
                            </span>
                          </h4>
                          <p style={{ margin: '8px 0 0 0', color: '#555', lineHeight: 1.5 }}>
                            {notification.message}
                          </p>
                          {notification.studentId && (
                            <p style={{
                              margin: '8px 0 0 0',
                              fontSize: '12px',
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              Student: {notification.studentId.firstName} {notification.studentId.lastName}
                            </p>
                          )}
                          {notification.tripId && (
                            <p style={{
                              margin: '4px 0 0 0',
                              fontSize: '12px',
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              Trip: {notification.tripId.routeName}
                            </p>
                          )}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#999'
                          }}>
                            <span>{formatTimeAgo(notification.createdAt)}</span>
                            {notification.smsSent && (
                              <span>SMS sent</span>
                            )}
                            {notification.readAt && (
                              <span>Read at {format(new Date(notification.readAt), 'h:mm a')}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!notification.isRead && (
                            <div style={{
                              width: '10px',
                              height: '10px',
                              background: '#2196F3',
                              borderRadius: '50%',
                              marginTop: '8px'
                            }} />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '18px',
                              cursor: 'pointer',
                              color: '#999',
                              padding: '4px 8px'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#f44336'}
                            onMouseLeave={(e) => e.target.style.color = '#999'}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '24px',
              padding: '16px'
            }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  background: currentPage === 1 ? '#f5f5f5' : '#2196F3',
                  color: currentPage === 1 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <span style={{
                padding: '8px 16px',
                background: '#f5f5f5',
                borderRadius: '6px',
                color: '#333'
              }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  background: currentPage === totalPages ? '#f5f5f5' : '#2196F3',
                  color: currentPage === totalPages ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}