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
  Avatar,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// API Service with better error handling
const messagingAPI = {
  getRecipients: async (role) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/messaging/recipients?role=${role}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch recipients');
      return data;
    } catch (error) {
      console.error(`Error fetching ${role}s:`, error);
      return { success: false, data: [] };
    }
  },
  
  sendMessage: async (data) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/messaging/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to send messages');
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  
  getMessageHistory: async (params = {}) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(`http://localhost:5000/api/messaging/history?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch history');
      return data;
    } catch (error) {
      console.error('Error fetching message history:', error);
      return { success: false, data: [] };
    }
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
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedParents, setSelectedParents] = useState([]);
  const [selectAllDrivers, setSelectAllDrivers] = useState(false);
  const [selectAllParents, setSelectAllParents] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('both'); // 'sms', 'email', 'both'
  const [sending, setSending] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
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
      
      if (driversRes.success) {
        setRecipients(prev => ({ ...prev, drivers: driversRes.data || [] }));
      }
      if (parentsRes.success) {
        setRecipients(prev => ({ ...prev, parents: parentsRes.data || [] }));
      }
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

  // Driver selection handlers
  const handleSelectAllDrivers = (checked) => {
    setSelectAllDrivers(checked);
    if (checked) {
      setSelectedDrivers(recipients.drivers.map(d => d.id || d._id));
    } else {
      setSelectedDrivers([]);
    }
  };

  const handleSelectDriver = (driverId) => {
    setSelectedDrivers(prev => {
      const newSelected = prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId];
      setSelectAllDrivers(newSelected.length === recipients.drivers.length && recipients.drivers.length > 0);
      return newSelected;
    });
  };

  // Parent selection handlers
  const handleSelectAllParents = (checked) => {
    setSelectAllParents(checked);
    if (checked) {
      setSelectedParents(recipients.parents.map(p => p.id || p._id));
    } else {
      setSelectedParents([]);
    }
  };

  const handleSelectParent = (parentId) => {
    setSelectedParents(prev => {
      const newSelected = prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId];
      setSelectAllParents(newSelected.length === recipients.parents.length && recipients.parents.length > 0);
      return newSelected;
    });
  };

  const getSelectedCount = () => {
    return selectedDrivers.length + selectedParents.length;
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
      ...selectedDrivers.map(id => {
        const driver = recipients.drivers.find(d => (d.id || d._id) === id);
        return `Driver: ${driver?.firstName} ${driver?.lastName}`;
      }),
      ...selectedParents.map(id => {
        const parent = recipients.parents.find(p => (p.id || p._id) === id);
        return `Parent: ${parent?.firstName} ${parent?.lastName}`;
      })
    ];
    
    setSendDialogOpen(true);
  };

  const handleSendMessage = async () => {
    setSending(true);
    try {
      const response = await messagingAPI.sendMessage({
        recipients: {
          drivers: selectedDrivers,
          parents: selectedParents
        },
        message: message.trim(),
        type: messageType
      });
      
      if (response.success) {
        const successCount = response.summary?.smsSent + response.summary?.emailSent || getSelectedCount();
        toast.success(`Message sent to ${successCount} recipient(s)`);
        setSendDialogOpen(false);
        setMessage('');
        setSelectedDrivers([]);
        setSelectedParents([]);
        setSelectAllDrivers(false);
        setSelectAllParents(false);
        fetchMessageHistory();
      } else {
        throw new Error(response.message || 'Failed to send messages');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error(error.message || 'Failed to send messages');
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
          <MessageIcon fontSize="large" color="primary" />
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
          <Card sx={{ bgcolor: '#e3f2fd' }}>
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
          <Card sx={{ bgcolor: '#e8f5e9' }}>
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
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Selected Recipients</Typography>
              <Typography variant="h4">{getSelectedCount()}</Typography>
              <Typography variant="body2">
                Drivers: {selectedDrivers.length} | Parents: {selectedParents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fce4ec' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Message Type</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  sx={{ mt: 1 }}
                >
                  <MenuItem value="sms">SMS Only (TextBee)</MenuItem>
                  <MenuItem value="email">Email Only</MenuItem>
                  <MenuItem value="both">SMS + Email</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Select Recipients" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="Message History" icon={<ScheduleIcon />} iconPosition="start" />
        </Tabs>
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
                        checked={selectAllDrivers}
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
                        key={driver.id || driver._id}
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
                          checked={selectedDrivers.includes(driver.id || driver._id)}
                          onChange={() => handleSelectDriver(driver.id || driver._id)}
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
                        checked={selectAllParents}
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
                        key={parent.id || parent._id}
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
                          checked={selectedParents.includes(parent.id || parent._id)}
                          onChange={() => handleSelectParent(parent.id || parent._id)}
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
                  helperText={
                    messageType === 'sms' 
                      ? `${message.length}/160 characters (SMS limit)`
                      : `${message.length} characters`
                  }
                  error={messageType === 'sms' && message.length > 160}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<SendIcon />}
                    onClick={handleOpenSendDialog}
                    disabled={getSelectedCount() === 0 || !message.trim() || (messageType === 'sms' && message.length > 160)}
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
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Recipient</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {messageHistory.map((msg) => (
                      <TableRow key={msg.id || msg._id} hover>
                        <TableCell>
                          {msg.createdAt ? format(new Date(msg.createdAt), 'MMM dd, HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={msg.type?.toUpperCase() || 'ADMIN'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={msg.message}>
                            <Typography variant="body2" sx={{ maxWidth: 250 }}>
                              {msg.message?.length > 60 ? msg.message.substring(0, 60) + '...' : msg.message}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {msg.recipient ? (
                            <Box>
                              <Typography variant="body2">{msg.recipient.name}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {msg.recipient.email}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="textSecondary">Broadcast</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {msg.smsSent !== false ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <ErrorIcon color="error" fontSize="small" />
                            )}
                            <Typography variant="caption">
                              {msg.smsSent !== false ? 'Sent' : 'Pending'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message}
            </Typography>
          </Alert>
          <Typography variant="body2" color="textSecondary">
            Sending to {getSelectedCount()} recipient(s):
          </Typography>
          <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
            {selectedDrivers.map(id => {
              const driver = recipients.drivers.find(d => (d.id || d._id) === id);
              return driver && (
                <Typography key={id} variant="caption" display="block">
                  • Driver: {driver.firstName} {driver.lastName}
                </Typography>
              );
            })}
            {selectedParents.map(id => {
              const parent = recipients.parents.find(p => (p.id || p._id) === id);
              return parent && (
                <Typography key={id} variant="caption" display="block">
                  • Parent: {parent.firstName} {parent.lastName}
                </Typography>
              );
            })}
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {messageType === 'sms' && 'SMS charges may apply.'}
            {messageType === 'email' && 'Email notifications will be sent.'}
            {messageType === 'both' && 'Both SMS and email notifications will be sent.'}
          </Alert>
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