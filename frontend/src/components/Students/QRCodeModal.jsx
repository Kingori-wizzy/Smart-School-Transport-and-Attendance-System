// File: frontend/src/components/Students/QRCodeModal.jsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper
} from '@mui/material';
import { QRCode } from 'react-qr-code'; // ✅ Correct import for react-qr-code
import { Print as PrintIcon, Download as DownloadIcon } from '@mui/icons-material';

const QRCodeModal = ({ open, onClose, student }) => {
  if (!student) return null;

  const handlePrint = () => {
    // Get the SVG element
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${student.firstName || ''} ${student.lastName || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .container { max-width: 400px; margin: 0 auto; }
            h2 { color: #333; }
            .details { margin: 20px 0; color: #666; }
            .qr-container { margin: 30px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>School Transport QR Code</h2>
            <div class="details">
              <p><strong>${student.firstName || ''} ${student.lastName || ''}</strong></p>
              <p>Admission: ${student.admissionNumber || ''}</p>
              <p>Class: ${student.classLevel || student.class || ''}</p>
            </div>
            <div class="qr-container">
              ${svgElement.outerHTML}
            </div>
            <div class="footer">
              <p>Present this QR code to the driver when boarding</p>
              <p>Smart School Transport System</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.print();
  };

  const handleDownload = () => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    
    // Convert SVG to PNG (optional - you might want to use a library for this)
    // For now, we'll just download the SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.download = `qr-${student.admissionNumber || 'student'}.svg`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Student QR Code
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" py={2}>
          <Typography variant="h6" gutterBottom>
            {student.firstName || ''} {student.lastName || ''}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Admission: {student.admissionNumber || ''}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Class: {student.classLevel || student.class || ''}
          </Typography>
          
          <Paper elevation={3} sx={{ p: 3, my: 2, bgcolor: '#f5f5f5' }}>
            <QRCode
              value={student.qrCode || `STU-${student.admissionNumber || 'unknown'}`}
              size={200}
              level="H"
            />
          </Paper>

          <Typography variant="body2" color="textSecondary" align="center">
            Scan this QR code when boarding the bus
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          color="primary"
        >
          Download SVG
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeModal;