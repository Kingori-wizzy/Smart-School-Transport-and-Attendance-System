/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
// ✅ FIXED: Import DirectionsBus instead of Bus
import DirectionsBus from '@mui/icons-material/DirectionsBus';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StudentForm from '../../components/Students/StudentForm';
import QRCodeModal from '../../components/Students/QRCodeModal';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const TransportStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterBus, setFilterBus] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openQRModal, setOpenQRModal] = useState(false);
  const [qrStudent, setQrStudent] = useState(null);
  const [buses, setBuses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    totalTransport: 0,
    linked: 0,
    unlinked: 0,
    active: 0
  });

  // Fetch initial data
  useEffect(() => {
    fetchStudents();
    fetchBuses();
    fetchClasses();
    fetchStats();
  }, [page, rowsPerPage, searchTerm, filterClass, filterBus, filterStatus]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        usesTransport: true,
        ...(searchTerm && { search: searchTerm }),
        ...(filterClass && { class: filterClass }),
        ...(filterBus && { busId: filterBus }),
        ...(filterStatus && { 'transportDetails.status': filterStatus })
      };

      const response = await api.get('/students', { params });
      setStudents(response.data.data || []);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await api.get('/buses');
      setBuses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchClasses = async () => {
    // This could come from a separate endpoint or be extracted from students
    const mockClasses = [
      'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Form 1', 'Form 2', 'Form 3', 'Form 4'
    ];
    setClasses(mockClasses);
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/students/stats/summary');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddStudent = () => {
    setSelectedStudent(null);
    setOpenForm(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedStudent(null);
  };

  const handleSaveStudent = async (studentData) => {
    try {
      if (selectedStudent) {
        await api.put(`/students/${selectedStudent._id}`, studentData);
        toast.success('Student updated successfully');
      } else {
        await api.post('/students', studentData);
        toast.success('Student added successfully');
      }
      fetchStudents();
      fetchStats();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.response?.data?.message || 'Failed to save student');
    }
  };

  const handleGenerateQR = async (student) => {
    try {
      const response = await api.post(`/students/${student._id}/generate-qr`);
      if (response.data.success) {
        setQrStudent({
          ...student,
          qrCode: response.data.qrCode
        });
        setOpenQRModal(true);
        fetchStudents(); // Refresh to show QR code
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const handlePrintQR = (student) => {
    setQrStudent(student);
    setOpenQRModal(true);
  };

  const handleCloseQRModal = () => {
    setOpenQRModal(false);
    setQrStudent(null);
  };

  const handleExport = () => {
    // Create CSV export
    const csvData = students.map(s => ({
      'Admission No': s.admissionNumber,
      'Name': `${s.firstName} ${s.lastName}`,
      'Class': s.classLevel,
      'Parent Linked': s.parentId ? 'Yes' : 'No',
      'Bus': s.transportDetails?.busId?.busNumber || s.busNumber || 'Not Assigned',
      'Status': s.transportDetails?.status || s.transportStatus,
      'Pickup': s.transportDetails?.pickupPoint?.name || s.pickupPoint,
      'Dropoff': s.transportDetails?.dropoffPoint?.name || s.dropOffPoint
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transport-students-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusChip = (status) => {
    const statusMap = {
      'active': { color: 'success', label: 'Active' },
      'inactive': { color: 'default', label: 'Inactive' },
      'suspended': { color: 'error', label: 'Suspended' },
      'pending': { color: 'warning', label: 'Pending' },
      'assigned': { color: 'success', label: 'Active' }
    };
    const statusInfo = statusMap[status] || { color: 'default', label: status };
    return <Chip size="small" color={statusInfo.color} label={statusInfo.label} />;
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ backgroundColor: `${color}.light`, p: 1, borderRadius: 2 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Transport Students
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddStudent}
          >
            Add Transport Student
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Transport"
            value={stats.totalTransport}
            icon={<DirectionsBus sx={{ color: '#1976d2' }} />} // ✅ FIXED: Using DirectionsBus
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Linked to Parent"
            value={stats.linked}
            icon={<LinkIcon sx={{ color: '#2e7d32' }} />}
            color="success"
            subtitle={`${stats.unlinked} unlinked`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircleIcon sx={{ color: '#ed6c02' }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Unlinked"
            value={stats.unlinked}
            icon={<WarningIcon sx={{ color: '#d32f2f' }} />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or admission number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                label="Class"
              >
                <MenuItem value="">All</MenuItem>
                {classes.map(cls => (
                  <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Bus</InputLabel>
              <Select
                value={filterBus}
                onChange={(e) => setFilterBus(e.target.value)}
                label="Bus"
              >
                <MenuItem value="">All</MenuItem>
                {buses.map(bus => (
                  <MenuItem key={bus._id} value={bus._id}>
                    {bus.busNumber || bus.registrationNumber}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStudents}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Students Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Admission No</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Bus</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>QR Code</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary">
                    No transport students found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {student.admissionNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>{student.classLevel}</TableCell>
                  <TableCell>
                    {student.parentId ? (
                      <Chip
                        size="small"
                        icon={<LinkIcon />}
                        label="Linked"
                        color="success"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        size="small"
                        label="Unlinked"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {student.transportDetails?.busId?.busNumber || 
                     student.busNumber || 
                     'Not Assigned'}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(student.transportDetails?.status || student.transportStatus)}
                  </TableCell>
                  <TableCell>
                    {student.qrCode ? (
                      <Tooltip title="View QR Code">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handlePrintQR(student)}
                        >
                          <QrCodeIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Generate QR Code">
                        <IconButton
                          size="small"
                          color="default"
                          onClick={() => handleGenerateQR(student)}
                        >
                          <QrCodeIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEditStudent(student)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Student Form Modal */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedStudent ? 'Edit Transport Student' : 'Add New Transport Student'}
        </DialogTitle>
        <DialogContent>
          <StudentForm
            student={selectedStudent}
            buses={buses}
            onSave={handleSaveStudent}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <QRCodeModal
        open={openQRModal}
        onClose={handleCloseQRModal}
        student={qrStudent}
      />
    </Box>
  );
};

export default TransportStudents;