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
  LinearProgress,
  Autocomplete,
  FormHelperText
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
  FileDownload as FileDownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsBus as DirectionsBusIcon,
  PersonAdd as PersonAddIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import StudentForm from '../../components/Students/StudentForm';
import QRCodeModal from '../../components/Students/QRCodeModal';
import { formatDate, formatNumber } from '../../utils/formatters';
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
  const [filterLinked, setFilterLinked] = useState('');
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
    active: 0,
    pending: 0,
    suspended: 0
  });
  
  // Bus assignment modal state
  const [openAssignBusModal, setOpenAssignBusModal] = useState(false);
  const [assignStudent, setAssignStudent] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropoffPoint, setDropoffPoint] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchStudents();
    fetchBuses();
    fetchClasses();
    fetchStats();
  }, [page, rowsPerPage, searchTerm, filterClass, filterBus, filterStatus, filterLinked]);

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
        ...(filterStatus && { transportStatus: filterStatus })
      };

      const response = await fetch(`http://localhost:5000/api/students?${new URLSearchParams(params).toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data || []);
        setTotalCount(data.total || 0);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/buses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setBuses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchClasses = async () => {
    const mockClasses = [
      'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Form 1', 'Form 2', 'Form 3', 'Form 4'
    ];
    setClasses(mockClasses);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/students/stats/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        const transportStudents = students.filter(s => s.usesTransport).length;
        const linkedStudents = students.filter(s => s.parentId).length;
        const unlinkedStudents = students.filter(s => !s.parentId && s.usesTransport).length;
        const activeStudents = students.filter(s => s.transportDetails?.status === 'active' || s.transportStatus === 'active').length;
        const pendingStudents = students.filter(s => s.transportDetails?.status === 'pending' || s.transportStatus === 'pending').length;
        
        setStats({
          totalTransport: transportStudents,
          linked: linkedStudents,
          unlinked: unlinkedStudents,
          active: activeStudents,
          pending: pendingStudents,
          suspended: students.filter(s => s.transportDetails?.status === 'suspended' || s.transportStatus === 'suspended').length
        });
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
      const url = selectedStudent 
        ? `http://localhost:5000/api/students/${selectedStudent._id}`
        : 'http://localhost:5000/api/students';
      const method = selectedStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save student');
      }
      
      toast.success(selectedStudent ? 'Student updated successfully' : 'Student added successfully');
      fetchStudents();
      fetchStats();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.message || 'Failed to save student');
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}?`)) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/students/${student._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete student');
      }
      
      toast.success('Student deleted successfully');
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const handleGenerateQR = async (student) => {
    try {
      const response = await fetch(`http://localhost:5000/api/students/${student._id}/generate-qr`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setQrStudent({
          ...student,
          qrCode: data.qrCode
        });
        setOpenQRModal(true);
        fetchStudents();
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

  const handleOpenAssignBus = (student) => {
    setAssignStudent(student);
    setSelectedBusId(student.transportDetails?.busId?._id || student.busId || '');
    setPickupPoint(student.transportDetails?.pickupPoint?.name || student.pickupPoint || '');
    setDropoffPoint(student.transportDetails?.dropoffPoint?.name || student.dropOffPoint || '');
    setOpenAssignBusModal(true);
  };

  const handleAssignBus = async () => {
    if (!selectedBusId) {
      toast.error('Please select a bus');
      return;
    }
    
    setAssignLoading(true);
    try {
      const updateData = {
        busId: selectedBusId,
        transportDetails: {
          busId: selectedBusId,
          status: 'active',
          pickupPoint: {
            name: pickupPoint || 'School Gate',
            coordinates: { lat: 0, lng: 0 }
          },
          dropoffPoint: {
            name: dropoffPoint || 'Home',
            coordinates: { lat: 0, lng: 0 }
          }
        },
        usesTransport: true
      };

      const response = await fetch(`http://localhost:5000/api/students/${assignStudent._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to assign bus');
      }
      
      const assignedBus = buses.find(b => b._id === selectedBusId);
      toast.success(`Student assigned to bus ${assignedBus?.busNumber || 'selected bus'} successfully`);
      setOpenAssignBusModal(false);
      setAssignStudent(null);
      setSelectedBusId('');
      setPickupPoint('');
      setDropoffPoint('');
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('Error assigning bus:', error);
      toast.error(error.message || 'Failed to assign bus');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleExport = () => {
    if (!students || students.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const csvData = students.map(s => ({
        'Admission No': s.admissionNumber || '',
        'Name': `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        'Class': s.classLevel || '',
        'Parent Linked': s.parentId ? 'Yes' : 'No',
        'Bus': s.transportDetails?.busId?.busNumber || s.busNumber || 'Not Assigned',
        'Status': s.transportDetails?.status || s.transportStatus || '',
        'Pickup': s.transportDetails?.pickupPoint?.name || s.pickupPoint || '',
        'Dropoff': s.transportDetails?.dropoffPoint?.name || s.dropOffPoint || ''
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
      window.URL.revokeObjectURL(url);
      toast.success('Export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const getStatusChip = (student) => {
    const status = student.transportDetails?.status || student.transportStatus;
    const statusMap = {
      'active': { color: 'success', label: 'Active' },
      'inactive': { color: 'default', label: 'Inactive' },
      'suspended': { color: 'error', label: 'Suspended' },
      'pending': { color: 'warning', label: 'Pending' },
      'assigned': { color: 'success', label: 'Assigned' }
    };
    const statusInfo = statusMap[status] || { color: 'default', label: status || 'Not Set' };
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
              {formatNumber(value)}
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Transport"
            value={stats.totalTransport}
            icon={<DirectionsBusIcon sx={{ color: '#1976d2' }} />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Linked to Parent"
            value={stats.linked}
            icon={<LinkIcon sx={{ color: '#2e7d32' }} />}
            color="success"
            subtitle={`${stats.unlinked} unlinked`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircleIcon sx={{ color: '#ed6c02' }} />}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<WarningIcon sx={{ color: '#d32f2f' }} />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Bus</InputLabel>
              <Select
                value={filterBus}
                onChange={(e) => setFilterBus(e.target.value)}
                label="Bus"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="unassigned">Not Assigned</MenuItem>
                {buses.map(bus => (
                  <MenuItem key={bus._id} value={bus._id}>
                    {bus.busNumber}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Parent Linked</InputLabel>
              <Select
                value={filterLinked}
                onChange={(e) => setFilterLinked(e.target.value)}
                label="Parent Linked"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="linked">Linked</MenuItem>
                <MenuItem value="unlinked">Unlinked</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
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
                    {getStatusChip(student)}
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Assign Bus">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenAssignBus(student)}
                        >
                          <DirectionsBusIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleEditStudent(student)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteStudent(student)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
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

      {/* Assign Bus Modal */}
      <Dialog
        open={openAssignBusModal}
        onClose={() => setOpenAssignBusModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Assign Bus to {assignStudent?.firstName} {assignStudent?.lastName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Bus</InputLabel>
              <Select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                label="Select Bus"
              >
                <MenuItem value="">None</MenuItem>
                {buses.map(bus => (
                  <MenuItem key={bus._id} value={bus._id}>
                    {bus.busNumber} - Capacity: {bus.capacity}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Choose a bus to assign to this student</FormHelperText>
            </FormControl>
            
            <TextField
              fullWidth
              size="small"
              label="Pickup Point"
              value={pickupPoint}
              onChange={(e) => setPickupPoint(e.target.value)}
              placeholder="Where student gets on"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              size="small"
              label="Dropoff Point"
              value={dropoffPoint}
              onChange={(e) => setDropoffPoint(e.target.value)}
              placeholder="Where student gets off"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignBusModal(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAssignBus}
            disabled={assignLoading || !selectedBusId}
            startIcon={assignLoading ? <LinearProgress sx={{ width: 20 }} /> : <AssignmentTurnedInIcon />}
          >
            {assignLoading ? 'Assigning...' : 'Assign Bus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransportStudents;