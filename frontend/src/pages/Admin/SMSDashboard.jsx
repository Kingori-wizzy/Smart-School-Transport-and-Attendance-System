import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Button,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  Timeline as TimelineIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';
import { smsAPI } from '../../services/api';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'];

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: '20px 0' }}>
    {value === index && children}
  </div>
);

const SMSDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState([]);
  const [providerHealth, setProviderHealth] = useState({});
  const [tabValue, setTabValue] = useState(0);
  const [testDialog, setTestDialog] = useState(false);
  const [testForm, setTestForm] = useState({
    phone: '',
    message: 'Test message from Smart School System',
    provider: 'both'
  });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchSMSStats();
    const interval = setInterval(fetchSMSStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSMSStats = async () => {
    try {
      setLoading(true);
      const response = await smsAPI.getStats();
      const data = response.data;
      
      // Parse stats safely
      const summary = data.summary || {};
      setStats({
        totalSMS: typeof summary.totalSMS === 'number' ? summary.totalSMS : 0,
        totalCost: typeof summary.totalCost === 'number' ? summary.totalCost : 
                   typeof summary.totalCost === 'string' ? parseFloat(summary.totalCost) : 0,
        byProvider: summary.byProvider || {}
      });
      setUsage(data.usage || []);
      setProviderHealth(data.providers || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching SMS stats:', err);
      setError('Failed to load SMS statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await smsAPI.testSMS(testForm);
      setTestResult(response.data.result);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const prepareDailyData = () => {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayData = usage.find(u => u._id?.date === date) || { count: 0, totalCost: 0 };
      last30Days.push({
        date: format(subDays(new Date(), i), 'MMM dd'),
        sms: dayData.count || 0,
        cost: typeof dayData.totalCost === 'number' ? dayData.totalCost : 0,
        smsLeopard: dayData._id?.provider === 'smsLeopard' ? dayData.count : 0,
        textBee: dayData._id?.provider === 'textBee' ? dayData.count : 0
      });
    }
    return last30Days;
  };

  const prepareProviderData = () => {
    const providerCount = {};
    usage.forEach(u => {
      const provider = u._id?.provider || 'unknown';
      providerCount[provider] = (providerCount[provider] || 0) + u.count;
    });
    return Object.entries(providerCount).map(([name, value]) => ({
      name: name === 'smsLeopard' ? 'SMSLeopard' : 
            name === 'textBee' ? 'TextBee (Free)' : name,
      value
    }));
  };

  const prepareStatusData = () => {
    const statusCount = {};
    usage.forEach(u => {
      const status = u._id?.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + u.count;
    });
    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      count
    }));
  };

  // Helper function to safely format cost
  const formatCost = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Calculate provider totals safely
  const smsLeopardTotal = usage.filter(u => u._id?.provider === 'smsLeopard')
    .reduce((acc, u) => acc + (u.count || 0), 0);
  const textBeeTotal = usage.filter(u => u._id?.provider === 'textBee')
    .reduce((acc, u) => acc + (u.count || 0), 0);
  const smsLeopardCost = usage.filter(u => u._id?.provider === 'smsLeopard')
    .reduce((acc, u) => acc + (u.totalCost || 0), 0);
  const savingsEstimate = textBeeTotal * 0.5;

  if (loading && !stats) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading SMS Dashboard...</Typography>
      </Box>
    );
  }

  const dailyData = prepareDailyData();
  const providerData = prepareProviderData();
  const statusData = prepareStatusData();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon sx={{ color: '#2196F3' }} /> SMS Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => setTestDialog(true)}
          >
            Test SMS
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchSMSStats}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Provider Health Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderLeft: 4, 
            borderColor: providerHealth.smsLeopard?.health ? '#4CAF50' : '#f44336'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>SMSLeopard (Primary)</Typography>
                  <Typography variant="h5">
                    {providerHealth.smsLeopard?.health ? 'Online' : 'Offline'}
                  </Typography>
                  {providerHealth.smsLeopard?.balance && (
                    <Typography variant="body2" color="textSecondary">
                      Balance: KES {providerHealth.smsLeopard.balance}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">Status: </Typography>
                  <Chip 
                    label={providerHealth.smsLeopard?.health ? 'Active' : 'Inactive'}
                    color={providerHealth.smsLeopard?.health ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderLeft: 4, 
            borderColor: providerHealth.textBee?.health ? '#4CAF50' : '#FF9800'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>TextBee (Free - Fallback)</Typography>
                  <Typography variant="h5">
                    {providerHealth.textBee?.health ? 'Online' : 'Check Device'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Free SMS - No cost
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">Status: </Typography>
                  <Chip 
                    label={providerHealth.textBee?.health ? 'Ready' : 'Check Device'}
                    color={providerHealth.textBee?.health ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total SMS (30 days)</Typography>
              <Typography variant="h4">{stats?.totalSMS || 0}</Typography>
              <Typography variant="body2" color="textSecondary">
                Avg: {Math.round((stats?.totalSMS || 0) / 30)}/day
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Cost</Typography>
              <Typography variant="h4">KES {formatCost(stats?.totalCost)}</Typography>
              <Typography variant="body2" color="textSecondary">
                Avg: KES {formatCost((stats?.totalCost || 0) / 30)}/day
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>SMSLeopard Usage</Typography>
              <Typography variant="h4">{smsLeopardTotal}</Typography>
              <Typography variant="body2" color="textSecondary">
                Cost: KES {formatCost(smsLeopardCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>TextBee Usage (Free)</Typography>
              <Typography variant="h4">{textBeeTotal}</Typography>
              <Typography variant="body2" color="textSecondary">
                Saved: KES {formatCost(savingsEstimate)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<TimelineIcon />} label="Daily Trend" />
          <Tab icon={<PieChart />} label="Provider Distribution" />
          <Tab icon={<ReceiptIcon />} label="Usage Details" />
          <Tab icon={<SettingsIcon />} label="Provider Status" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>SMS Volume & Cost Trend</Typography>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="smsLeopard" fill="#2196F3" name="SMSLeopard" />
                <Bar yAxisId="left" dataKey="textBee" fill="#4CAF50" name="TextBee (Free)" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#FF9800" name="Cost (KES)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>SMS by Provider</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {providerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Delivery Status</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#4CAF50">
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.status === 'sent' ? '#4CAF50' :
                            entry.status === 'failed' ? '#f44336' :
                            entry.status === 'pending' ? '#FF9800' : '#2196F3'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Detailed SMS Log</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Cost (KES)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usage.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row._id?.date || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row._id?.provider === 'smsLeopard' ? 'SMSLeopard' : 
                               row._id?.provider === 'textBee' ? 'TextBee' : 'Unknown'}
                        size="small"
                        color={row._id?.provider === 'smsLeopard' ? 'primary' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={row._id?.status || 'unknown'}
                        size="small"
                        color={
                          row._id?.status === 'sent' ? 'success' :
                          row._id?.status === 'failed' ? 'error' :
                          row._id?.status === 'pending' ? 'warning' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">{row.count || 0}</TableCell>
                    <TableCell align="right">{formatCost(row.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>SMSLeopard Status</Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Status</Typography>
                      <Chip 
                        label={providerHealth.smsLeopard?.health ? 'Online' : 'Offline'}
                        color={providerHealth.smsLeopard?.health ? 'success' : 'error'}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Balance</Typography>
                      <Typography variant="h6">KES {providerHealth.smsLeopard?.balance || 0}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="textSecondary">Cost per SMS</Typography>
                      <Typography variant="body1">KES 0.25 - 0.50</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>TextBee Status</Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Device Status</Typography>
                      <Chip 
                        label={providerHealth.textBee?.health ? 'Connected' : 'Disconnected'}
                        color={providerHealth.textBee?.health ? 'success' : 'warning'}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Type</Typography>
                      <Typography variant="body1">Free SMS Gateway</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="textSecondary">Savings</Typography>
                      <Typography variant="h6" color="success.main">
                        KES {formatCost(savingsEstimate)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Test SMS Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test SMS Provider</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Phone Number"
              value={testForm.phone}
              onChange={(e) => setTestForm({ ...testForm, phone: e.target.value })}
              placeholder="0712345678"
              margin="normal"
            />
            <TextField
              fullWidth
              label="Message"
              value={testForm.message}
              onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
              multiline
              rows={3}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Provider</InputLabel>
              <Select
                value={testForm.provider}
                label="Provider"
                onChange={(e) => setTestForm({ ...testForm, provider: e.target.value })}
              >
                <MenuItem value="both">Both (Smart Fallback)</MenuItem>
                <MenuItem value="smsLeopard">SMSLeopard Only</MenuItem>
                <MenuItem value="textBee">TextBee Only</MenuItem>
              </Select>
            </FormControl>

            {testResult && (
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
                {testResult.success ? (
                  <>
                    <Typography variant="body2">Provider: {testResult.provider}</Typography>
                    <Typography variant="body2">Message ID: {testResult.messageId}</Typography>
                    <Typography variant="body2">Cost: {testResult.cost ? `KES ${testResult.cost}` : 'Free'}</Typography>
                  </>
                ) : (
                  <Typography variant="body2">{testResult.error}</Typography>
                )}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleTestSMS} 
            variant="contained"
            disabled={testLoading || !testForm.phone}
          >
            {testLoading ? 'Sending...' : 'Send Test SMS'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SMSDashboard;