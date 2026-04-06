/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Snackbar,
  Avatar
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// API Service
const messagingAPI = {
  getRecipients: async (role) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/messaging/recipients?role=${role}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },
  
  sendMessage: async (data) => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/messaging/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  getMessageHistory: async (params) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`http://localhost:5000/api/messaging/history?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: '20px 0' }}>
    {value === index && children}
  </div>
);

export default function MessagingDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState({ drivers: [], parents: [] });
  const [selectedRecipients, setSelectedRecipients] = useState({
    drivers: [],
    parents: []
  });
  const [selectAll, setSelectAll] = useState({ drivers: false, parents: false });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('sms');
  const [sending, setSending] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRecipients();
    fetchMessageHistory();
  }, []);

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const [driversRes, parentsRes] = await Promise.all([
        messagingAPI.getRecipients('driver'),
        messagingAPI.getRecipients('parent')
      ]);
      
      if (driversRes.success) setRecipients(prev => ({ ...prev, drivers: driversRes.data || [] }));
      if (parentsRes.success) setRecipients(prev => ({ ...prev, parents: parentsRes.data || [] }));
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await messagingAPI.getMessageHistory({ limit: 50 });
      if (response.success) {
        setMessageHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAllDrivers = (checked) => {
    setSelectAll(prev => ({ ...prev, drivers: checked }));
    if (checked) {
      setSelectedRecipients(prev => ({
        ...prev,
        drivers: recipients.drivers.map(d => d._id)
      }));
    } else {
      setSelectedRecipients(prev => ({ ...prev, drivers: [] }));
    }
  };

  const handleSelectAllParents = (checked) => {
    setSelectAll(prev => ({ ...prev, parents: checked }));
    if (checked) {
      setSelectedRecipients(prev => ({
        ...prev,
        parents: recipients.parents.map(p => p._id)
      }));
    } else {
      setSelectedRecipients(prev => ({ ...prev, parents: [] }));
    }
  };

  const handleSelectDriver = (driverId) => {
    setSelectedRecipients(prev => ({
      ...prev,
      drivers: prev.drivers.includes(driverId)
        ? prev.drivers.filter(id => id !== driverId)
        : [...prev.drivers, driverId]
    }));
  };

  const handleSelectParent = (parentId) => {
    setSelectedRecipients(prev => ({
      ...prev,
      parents: prev.parents.includes(parentId)
        ? prev.parents.filter(id => id !== parentId)
        : [...prev.parents, parentId]
    }));
  };

  const getSelectedCount = () => {
    return selectedRecipients.drivers.length + selectedRecipients.parents.length;
  };

  const handleOpenSendDialog = () => {
    if (getSelectedCount() === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    const recipientList = [
      ...selectedRecipients.drivers.map(id => {
        const driver = recipients.drivers.find(d => d._id === id);
        return `Driver: ${driver?.firstName} ${driver?.lastName} (${driver?.phone || driver?.email})`;
      }),
      ...selectedRecipients.parents.map(id => {
        const parent = recipients.parents.find(p => p._id === id);
        return `Parent: ${parent?.firstName} ${parent?.lastName} (${parent?.phone || parent?.email})`;
      })
    ];
    
    setPreviewMessage(`
      Message Preview
      
      Recipients: ${recipientList.length} people
      Type: ${messageType.toUpperCase()}
      
      Message:
      ${message}
      
      ${messageType === 'sms' ? 'SMS charges may apply' : 'Email notifications will be sent'}
    `);
    
    setSendDialogOpen(true);
  };

  const handleSendMessage = async () => {
    setSending(true);
    try {
      const response = await messagingAPI.sendMessage({
        recipients: {
          drivers: selectedRecipients.drivers,
          parents: selectedRecipients.parents
        },
        message: message,
        type: messageType
      });
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Message sent to ${response.summary?.successful || getSelectedCount()} recipients`,
          severity: 'success'
        });
        setSendDialogOpen(false);
        setMessage('');
        setSelectedRecipients({ drivers: [], parents: [] });
        setSelectAll({ drivers: false, parents: false });
        fetchMessageHistory();
      } else {
        throw new Error(response.message || 'Failed to send messages');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to send messages',
        severity: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  const getTotalRecipients = () => {
    return recipients.drivers.length + recipients.parents.length;
  };

  const getActiveRecipients = () => {
    return recipients.drivers.filter(d => d.isActive !== false).length +
           recipients.parents.filter(p => p.isActive !== false).length;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Messaging Center
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchRecipients();
            fetchMessageHistory();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Drivers</Typography>
              <Typography variant="h4">{recipients.drivers.length}</Typography>
              <Typography variant="body2" color="textSecondary">
                Active: {recipients.drivers.filter(d => d.isActive !== false).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Parents</Typography>
              <Typography variant="h4">{recipients.parents.length}</Typography>
              <Typography variant="body2" color="textSecondary">
                Active: {recipients.parents.filter(p => p.isActive !== false).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Selected Recipients</Typography>
              <Typography variant="h4">{getSelectedCount()}</Typography>
              <Typography variant="body2">
                Drivers: {selectedRecipients.drivers.length} | Parents: {selectedRecipients.parents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Message Type</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  sx={{ mt: 1 }}
                >
                  <MenuItem value="sms">SMS Only</MenuItem>
                  <MenuItem value="email">Email Only</MenuItem>
                  <MenuItem value="both">SMS + Email</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={() => setTabValue(0)}
            variant={tabValue === 0 ? 'contained' : 'text'}
            startIcon={<GroupIcon />}
          >
            Select Recipients
          </Button>
          <Button
            onClick={() => setTabValue(1)}
            variant={tabValue === 1 ? 'contained' : 'text'}
            startIcon={<ScheduleIcon />}
          >
            Message History
          </Button>
        </Box>
      </Box>

      {/* Tab 1: Select Recipients */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Drivers Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Drivers ({recipients.drivers.length})
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectAll.drivers}
                        onChange={(e) => handleSelectAllDrivers(e.target.checked)}
                      />
                    }
                    label="Select All"
                  />
                </Box>
                <Divider />
                {loading ? (
                  <LinearProgress sx={{ my: 2 }} />
                ) : recipients.drivers.length === 0 ? (
                  <Typography color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                    No drivers found
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {recipients.drivers.map((driver) => (
                      <Box
                        key={driver._id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#2196F3' }}>
                            {driver.firstName?.[0] || 'D'}
                          </Avatar>
                          <Box>
                            <Typography variant="body1">
                              {driver.firstName} {driver.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {driver.phone || driver.email}
                            </Typography>
                          </Box>
                        </Box>
                        <Checkbox
                          checked={selectedRecipients.drivers.includes(driver._id)}
                          onChange={() => handleSelectDriver(driver._id)}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Parents Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Parents ({recipients.parents.length})
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectAll.parents}
                        onChange={(e) => handleSelectAllParents(e.target.checked)}
                      />
                    }
                    label="Select All"
                  />
                </Box>
                <Divider />
                {loading ? (
                  <LinearProgress sx={{ my: 2 }} />
                ) : recipients.parents.length === 0 ? (
                  <Typography color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                    No parents found
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {recipients.parents.map((parent) => (
                      <Box
                        key={parent._id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#4CAF50' }}>
                            {parent.firstName?.[0] || 'P'}
                          </Avatar>
                          <Box>
                            <Typography variant="body1">
                              {parent.firstName} {parent.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {parent.phone || parent.email}
                            </Typography>
                          </Box>
                        </Box>
                        <Checkbox
                          checked={selectedRecipients.parents.includes(parent._id)}
                          onChange={() => handleSelectParent(parent._id)}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Message Composition */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compose Message
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText={`${message.length}/160 characters ${messageType === 'sms' ? '(SMS limit)' : ''}`}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<SendIcon />}
                    onClick={handleOpenSendDialog}
                    disabled={getSelectedCount() === 0 || !message.trim()}
                  >
                    Send to {getSelectedCount()} Recipient{getSelectedCount() !== 1 ? 's' : ''}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Message History */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Messages</Typography>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : messageHistory.length === 0 ? (
              <Typography color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                No messages sent yet
              </Typography>
            ) : (
              <Box sx={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Message</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messageHistory.map((msg) => (
                      <tr key={msg._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip
                            label={msg.type?.toUpperCase()}
                            size="small"
                            color={msg.type === 'sms' ? 'primary' : msg.type === 'email' ? 'secondary' : 'default'}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography variant="body2" sx={{ maxWidth: 300 }}>
                            {msg.message?.substring(0, 80)}...
                          </Typography>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {msg.deliveryStatus?.success ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <ErrorIcon color="error" fontSize="small" />
                            )}
                            <Typography variant="caption">
                              {msg.deliveryStatus?.success ? 'Delivered' : 'Failed'}
                            </Typography>
                          </Box>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Confirmation Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Send</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Message Preview</AlertTitle>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {previewMessage}
            </pre>
          </Alert>
          <Typography variant="body2" color="textSecondary">
            This action cannot be undone. Messages will be sent immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendMessage}
            variant="contained"
            color="primary"
            disabled={sending}
            startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {sending ? 'Sending...' : 'Confirm Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}