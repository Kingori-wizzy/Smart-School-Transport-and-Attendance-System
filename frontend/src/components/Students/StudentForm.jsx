/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  Button,
  Paper,
  RadioGroup,
  Radio,
  FormLabel,
  FormHelperText
} from '@mui/material';

const StudentForm = ({ student, buses = [], onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    admissionNumber: '',
    age: '',
    gender: 'Male',
    classLevel: '',
    stream: '',
    guardianContact: '',
    usesTransport: true,
    transportDetails: {
      pickupPoint: {
        name: '',
        coordinates: { lat: '', lng: '' },
        time: '',
        instructions: ''
      },
      dropoffPoint: {
        name: '',
        coordinates: { lat: '', lng: '' },
        time: '',
        instructions: ''
      },
      busId: '',
      status: 'pending',
      feePaid: false,
      feeAmount: '',
      specialNotes: ''
    }
  });

  const [errors, setErrors] = useState({});

  // Load student data if editing
  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        admissionNumber: student.admissionNumber || '',
        age: student.age || '',
        gender: student.gender || 'Male',
        classLevel: student.classLevel || '',
        stream: student.stream || '',
        guardianContact: student.guardianContact || '',
        usesTransport: student.usesTransport !== undefined ? student.usesTransport : true,
        transportDetails: {
          pickupPoint: {
            name: student.transportDetails?.pickupPoint?.name || student.pickupPoint || '',
            coordinates: {
              lat: student.transportDetails?.pickupPoint?.coordinates?.lat || '',
              lng: student.transportDetails?.pickupPoint?.coordinates?.lng || ''
            },
            time: student.transportDetails?.pickupPoint?.time || '',
            instructions: student.transportDetails?.pickupPoint?.instructions || ''
          },
          dropoffPoint: {
            name: student.transportDetails?.dropoffPoint?.name || student.dropOffPoint || '',
            coordinates: {
              lat: student.transportDetails?.dropoffPoint?.coordinates?.lat || '',
              lng: student.transportDetails?.dropoffPoint?.coordinates?.lng || ''
            },
            time: student.transportDetails?.dropoffPoint?.time || '',
            instructions: student.transportDetails?.dropoffPoint?.instructions || ''
          },
          busId: student.transportDetails?.busId?._id || student.transportDetails?.busId || student.busId || '',
          status: student.transportDetails?.status || student.transportStatus || 'pending',
          feePaid: student.transportDetails?.feePaid || false,
          feeAmount: student.transportDetails?.feeAmount || '',
          specialNotes: student.transportDetails?.specialNotes || ''
        }
      });
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested fields
      const [parent, child, grandchild] = name.split('.');
      if (grandchild) {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [grandchild]: type === 'checkbox' ? checked : value
            }
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: type === 'checkbox' ? checked : value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.admissionNumber.trim()) newErrors.admissionNumber = 'Admission number is required';
    if (!formData.age) newErrors.age = 'Age is required';
    else if (formData.age < 3 || formData.age > 25) newErrors.age = 'Age must be between 3 and 25';
    if (!formData.classLevel) newErrors.classLevel = 'Class is required';
    if (!formData.guardianContact.trim()) newErrors.guardianContact = 'Guardian contact is required';
    
    // Transport-specific validation
    if (formData.usesTransport) {
      if (!formData.transportDetails.pickupPoint.name) {
        newErrors['transportDetails.pickupPoint.name'] = 'Pickup point is required';
      }
      if (!formData.transportDetails.dropoffPoint.name) {
        newErrors['transportDetails.dropoffPoint.name'] = 'Dropoff point is required';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        {/* Personal Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Divider />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            error={!!errors.firstName}
            helperText={errors.firstName}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            error={!!errors.lastName}
            helperText={errors.lastName}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Admission Number"
            name="admissionNumber"
            value={formData.admissionNumber}
            onChange={handleChange}
            error={!!errors.admissionNumber}
            helperText={errors.admissionNumber}
            required
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Age"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleChange}
            error={!!errors.age}
            helperText={errors.age}
            required
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <FormControl fullWidth required>
            <InputLabel>Gender</InputLabel>
            <Select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              label="Gender"
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Class"
            name="classLevel"
            value={formData.classLevel}
            onChange={handleChange}
            error={!!errors.classLevel}
            helperText={errors.classLevel}
            required
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Stream (Optional)"
            name="stream"
            value={formData.stream}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Guardian Contact"
            name="guardianContact"
            value={formData.guardianContact}
            onChange={handleChange}
            error={!!errors.guardianContact}
            helperText={errors.guardianContact}
            required
            placeholder="+254712345678"
          />
        </Grid>

        {/* Transport Information */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Transport Information
          </Typography>
          <Divider />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.usesTransport}
                onChange={handleChange}
                name="usesTransport"
                color="primary"
              />
            }
            label="Student uses school transport"
          />
        </Grid>

        {formData.usesTransport && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pickup Point"
                name="transportDetails.pickupPoint.name"
                value={formData.transportDetails.pickupPoint.name}
                onChange={handleChange}
                error={!!errors['transportDetails.pickupPoint.name']}
                helperText={errors['transportDetails.pickupPoint.name']}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dropoff Point"
                name="transportDetails.dropoffPoint.name"
                value={formData.transportDetails.dropoffPoint.name}
                onChange={handleChange}
                error={!!errors['transportDetails.dropoffPoint.name']}
                helperText={errors['transportDetails.dropoffPoint.name']}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pickup Time (Optional)"
                name="transportDetails.pickupPoint.time"
                value={formData.transportDetails.pickupPoint.time}
                onChange={handleChange}
                placeholder="06:45"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dropoff Time (Optional)"
                name="transportDetails.dropoffPoint.time"
                value={formData.transportDetails.dropoffPoint.time}
                onChange={handleChange}
                placeholder="16:00"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Instructions (Optional)"
                name="transportDetails.pickupPoint.instructions"
                value={formData.transportDetails.pickupPoint.instructions}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Any special instructions for pickup/dropoff"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Assign Bus</InputLabel>
                <Select
                  name="transportDetails.busId"
                  value={formData.transportDetails.busId}
                  onChange={handleChange}
                  label="Assign Bus"
                >
                  <MenuItem value="">None</MenuItem>
                  {buses.map(bus => (
                    <MenuItem key={bus._id} value={bus._id}>
                      {bus.busNumber || bus.registrationNumber}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="transportDetails.status"
                  value={formData.transportDetails.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Transport Fee (KES)"
                name="transportDetails.feeAmount"
                type="number"
                value={formData.transportDetails.feeAmount}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.transportDetails.feePaid}
                    onChange={handleChange}
                    name="transportDetails.feePaid"
                    color="success"
                  />
                }
                label="Fee Paid"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Notes"
                name="transportDetails.specialNotes"
                value={formData.transportDetails.specialNotes}
                onChange={handleChange}
                multiline
                rows={3}
                placeholder="Any additional notes about transport"
              />
            </Grid>
          </>
        )}

        {/* Form Actions */}
        <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {student ? 'Update' : 'Save'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentForm;