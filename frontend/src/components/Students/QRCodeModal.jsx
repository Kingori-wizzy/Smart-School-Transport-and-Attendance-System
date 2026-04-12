// File: frontend/src/components/Students/QRCodeModal.jsx

import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { QRCode } from 'react-qr-code';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const QRCodeModal = ({ open, onClose, student }) => {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('svg');

  if (!student) return null;

  const qrValue = student.qrCode || `STU-${student.admissionNumber || student._id || 'unknown'}`;
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();

  const handlePrint = () => {
    const qrContainer = document.getElementById('qr-code-container');
    if (!qrContainer) return;
    
    const qrSvg = qrContainer.querySelector('svg');
    if (!qrSvg) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${studentName}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 40px 20px;
              background: white;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              border: 2px solid #e0e0e0;
              border-radius: 16px;
              padding: 30px;
              background: white;
            }
            .header {
              margin-bottom: 20px;
            }
            .header h1 {
              color: #1976D2;
              font-size: 24px;
              margin-bottom: 8px;
            }
            .header p {
              color: #666;
              font-size: 14px;
            }
            .student-details {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 12px;
              margin: 20px 0;
              text-align: left;
            }
            .student-details p {
              margin: 8px 0;
              font-size: 14px;
            }
            .student-details .label {
              font-weight: bold;
              color: #555;
              min-width: 100px;
              display: inline-block;
            }
            .qr-container {
              margin: 25px 0;
              padding: 20px;
              background: white;
              border-radius: 12px;
              display: flex;
              justify-content: center;
            }
            .qr-container svg {
              width: 250px;
              height: 250px;
            }
            .footer {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 1px solid #e0e0e0;
              font-size: 11px;
              color: #999;
            }
            .footer p {
              margin: 4px 0;
            }
            .badge {
              display: inline-block;
              background: #4CAF50;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              margin-top: 10px;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Smart School Transport</h1>
              <p>Student Identification QR Code</p>
            </div>
            <div class="student-details">
              <p><span class="label">Student Name:</span> ${studentName}</p>
              <p><span class="label">Admission Number:</span> ${student.admissionNumber || 'N/A'}</p>
              <p><span class="label">Class:</span> ${student.classLevel || student.class || 'N/A'}</p>
              <p><span class="label">Parent Contact:</span> ${student.parentPhone || 'N/A'}</p>
            </div>
            <div class="qr-container">
              ${qrSvg.outerHTML}
            </div>
            <div class="badge">Valid ID</div>
            <div class="footer">
              <p>Present this QR code to the driver when boarding the bus</p>
              <p>Scan to record attendance and track location</p>
              <p>Generated: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadAsSVG = () => {
    const qrContainer = document.getElementById('qr-code-container');
    if (!qrContainer) return;
    
    const svgElement = qrContainer.querySelector('svg');
    if (!svgElement) return;
    
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    
    // Add styling to SVG
    svgString = svgString.replace(
      '<svg',
      '<svg xmlns="http://www.w3.org/2000/svg" style="background: white; border-radius: 8px;"'
    );
    
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.download = `qr-code-${student.admissionNumber || student._id || 'student'}.svg`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsPNG = () => {
    const qrContainer = document.getElementById('qr-code-container');
    if (!qrContainer) return;
    
    const svgElement = qrContainer.querySelector('svg');
    if (!svgElement) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-code-${student.admissionNumber || student._id || 'student'}.png`;
      link.href = pngUrl;
      link.click();
      
      URL.revokeObjectURL(url);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    img.src = url;
  };

  const handleDownload = () => {
    if (downloadFormat === 'svg') {
      downloadAsSVG();
    } else {
      downloadAsPNG();
    }
  };

  const copyToClipboard = async () => {
    const qrContainer = document.getElementById('qr-code-container');
    if (!qrContainer) return;
    
    const svgElement = qrContainer.querySelector('svg');
    if (!svgElement) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          URL.revokeObjectURL(url);
        });
      };
      img.src = url;
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: copy the QR value as text
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#1976D2', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <QrCodeScannerIcon />
            <Typography variant="h6">Student QR Code</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            {/* Student Information Card */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                mb: 3, 
                width: '100%', 
                bgcolor: '#f8f9fa',
                borderRadius: 2
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" color="#1976D2" gutterBottom>
                Student Information
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box display="grid" gridTemplateColumns="120px 1fr" gap={1}>
                <Typography variant="body2" color="textSecondary">Full Name:</Typography>
                <Typography variant="body2" fontWeight="500">{studentName || 'N/A'}</Typography>
                
                <Typography variant="body2" color="textSecondary">Admission No:</Typography>
                <Typography variant="body2" fontWeight="500">{student.admissionNumber || 'N/A'}</Typography>
                
                <Typography variant="body2" color="textSecondary">Class:</Typography>
                <Typography variant="body2" fontWeight="500">{student.classLevel || student.class || 'N/A'}</Typography>
                
                {student.parentPhone && (
                  <>
                    <Typography variant="body2" color="textSecondary">Parent Phone:</Typography>
                    <Typography variant="body2" fontWeight="500">{student.parentPhone}</Typography>
                  </>
                )}
                
                {student.busNumber && (
                  <>
                    <Typography variant="body2" color="textSecondary">Assigned Bus:</Typography>
                    <Typography variant="body2" fontWeight="500">{student.busNumber}</Typography>
                  </>
                )}
              </Box>
            </Paper>

            {/* QR Code Display */}
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                my: 1, 
                bgcolor: 'white',
                borderRadius: 3,
                border: '2px solid #e0e0e0'
              }}
            >
              <div id="qr-code-container" ref={qrRef}>
                <QRCode
                  value={qrValue}
                  size={220}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </Paper>

            {/* QR Value Display */}
            <Alert 
              severity="info" 
              icon={<InfoIcon />}
              sx={{ mt: 2, width: '100%', fontSize: '12px' }}
            >
              <strong>QR Value:</strong> {qrValue}
              <br />
              <small>This code uniquely identifies the student</small>
            </Alert>

            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
              Scan this QR code when boarding or alighting from the bus
            </Typography>
            <Typography variant="caption" color="textSecondary" align="center">
              Parents will receive SMS notifications when this code is scanned
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pt: 1, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={onClose} variant="text" color="inherit">
            Close
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={copyToClipboard}
            size="small"
          >
            Copy QR
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '12px',
                background: 'white'
              }}
            >
              <option value="svg">SVG Format</option>
              <option value="png">PNG Format</option>
            </select>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              color="primary"
              size="small"
            >
              Download
            </Button>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            color="secondary"
            size="small"
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {downloadFormat === 'svg' ? 'QR code downloaded successfully' : 'QR code copied to clipboard'}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QRCodeModal;