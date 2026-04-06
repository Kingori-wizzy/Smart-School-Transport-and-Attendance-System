/* eslint-disable no-unused-vars */
/* eslint-disable no-case-declarations */
import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0', '#673AB7'];

export default function ReportGenerator({ onReportGenerated }) {
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Correct endpoints for each report type
  const reportTypes = [
    { id: 'attendance', name: 'Attendance Report', icon: '📊', description: 'Daily attendance trends, class distribution, and student statistics', endpoint: '/api/reports/attendance' },
    { id: 'transport', name: 'Transport Report', icon: '🚌', description: 'Bus utilization, trip logs, and fuel consumption', endpoint: '/api/reports/transport' },
    { id: 'drivers', name: 'Driver Performance', icon: '👤', description: 'Driver ratings, safety scores, and trip history', endpoint: '/api/reports/drivers' },
    { id: 'routes', name: 'Route Efficiency', icon: '🗺️', description: 'Route optimization, on-time performance, and stop analysis', endpoint: '/api/reports/routes' },
    { id: 'alerts', name: 'Alerts & Incidents', icon: '⚠️', description: 'Speed violations, geofence breaches, and system alerts', endpoint: '/api/reports/incident' },
    { id: 'combined', name: 'Combined Summary', icon: '📑', description: 'Executive summary of all key metrics', endpoint: '/api/reports/combined' }
  ];

  const dateRanges = [
    { id: 'today', name: 'Today' },
    { id: 'yesterday', name: 'Yesterday' },
    { id: 'week', name: 'This Week' },
    { id: 'lastweek', name: 'Last Week' },
    { id: 'month', name: 'This Month' },
    { id: 'lastmonth', name: 'Last Month' },
    { id: 'custom', name: 'Custom Range' }
  ];

  useEffect(() => {
    fetchSavedReports();
  }, []);

  const fetchSavedReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSavedReports(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching saved reports:', error);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    
    switch(range) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setStartDate(format(yesterday, 'yyyy-MM-dd'));
        setEndDate(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'lastweek':
        const lastWeekStart = subDays(today, 14);
        const lastWeekEnd = subDays(today, 8);
        setStartDate(format(lastWeekStart, 'yyyy-MM-dd'));
        setEndDate(format(lastWeekEnd, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'lastmonth':
        const lastMonthStart = subDays(today, 60);
        const lastMonthEnd = subDays(today, 31);
        setStartDate(format(lastMonthStart, 'yyyy-MM-dd'));
        setEndDate(format(lastMonthEnd, 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  const generatePreview = async () => {
    setGenerating(true);
    
    try {
      let url = '';
      switch(reportType) {
        case 'attendance':
          url = `http://localhost:5000/api/reports/attendance?startDate=${startDate}&endDate=${endDate}`;
          break;
        case 'transport':
          url = `http://localhost:5000/api/reports/transport?startDate=${startDate}&endDate=${endDate}`;
          break;
        case 'drivers':
          url = `http://localhost:5000/api/reports/drivers?startDate=${startDate}&endDate=${endDate}`;
          break;
        case 'routes':
          url = `http://localhost:5000/api/reports/routes?startDate=${startDate}&endDate=${endDate}`;
          break;
        case 'alerts':
          url = `http://localhost:5000/api/reports/incident?startDate=${startDate}&endDate=${endDate}`;
          break;
        case 'combined':
          url = `http://localhost:5000/api/reports/combined?startDate=${startDate}&endDate=${endDate}`;
          break;
        default:
          url = `http://localhost:5000/api/reports/attendance?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.data);
        setReportData(data.data);
        toast.success('Report preview generated');
        if (onReportGenerated) onReportGenerated();
      } else {
        throw new Error(data.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Helper function to convert data to proper CSV format
  const convertToCSV = (data) => {
    if (!data) return '';
    
    // Handle summary-only data (like combined report)
    if (data.summary && !data.rawData && !data.dailyTrend) {
      const rows = [['Metric', 'Value']];
      Object.entries(data.summary).forEach(([key, value]) => {
        let displayValue = value;
        if (key.includes('rate')) displayValue = `${value}%`;
        if (key.includes('Distance')) displayValue = `${value} km`;
        rows.push([key.replace(/([A-Z])/g, ' $1').trim(), displayValue]);
      });
      return rows.map(row => row.join(',')).join('\n');
    }
    
    // Handle daily trend data (attendance report)
    if (data.dailyTrend && data.dailyTrend.length > 0) {
      const headers = ['Date', 'Present', 'Absent', 'Late'];
      const rows = data.dailyTrend.map(day => [
        day.date,
        day.present || 0,
        day.absent || 0,
        day.late || 0
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    // Handle bus performance data (transport report)
    if (data.busPerformance && data.busPerformance.length > 0) {
      const headers = ['Bus Name', 'Trips', 'On Time', 'Distance (km)'];
      const rows = data.busPerformance.map(bus => [
        bus.name,
        bus.trips || 0,
        bus.onTime || 0,
        bus.distance || 0
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    // Handle top drivers data
    if (data.topDrivers && data.topDrivers.length > 0) {
      const headers = ['Driver Name', 'Trips', 'Rating'];
      const rows = data.topDrivers.map(driver => [
        driver.name,
        driver.trips || 0,
        driver.rating || 0
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    // Handle route efficiency data
    if (data.routeEfficiency && data.routeEfficiency.length > 0) {
      const headers = ['Route Name', 'On Time %', 'Average Load', 'Trips'];
      const rows = data.routeEfficiency.map(route => [
        route.name,
        route.onTime || 0,
        route.load || 0,
        route.trips || 0
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    // Handle alerts by type
    if (data.alertsByType && data.alertsByType.length > 0) {
      const headers = ['Alert Type', 'Count'];
      const rows = data.alertsByType.map(alert => [
        alert.name,
        alert.value || 0
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    // Fallback for raw data array
    const sourceData = data.rawData || data;
    if (Array.isArray(sourceData) && sourceData.length > 0) {
      const headers = Object.keys(sourceData[0]);
      const rows = sourceData.map(row => 
        headers.map(header => {
          let value = row[header];
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }
    
    // Ultimate fallback
    return JSON.stringify(sourceData, null, 2);
  };

  // Helper function to generate PDF-friendly HTML
  const generatePDFHTML = (data) => {
    const reportTitle = reportTypes.find(r => r.id === reportType)?.name || 'Report';
    
    let summaryHtml = '';
    if (data.summary) {
      summaryHtml = `
        <div class="summary">
          ${Object.entries(data.summary).map(([key, value]) => `
            <div class="card">
              <div class="card-value">${value}${key.includes('rate') ? '%' : key.includes('Distance') ? ' km' : key.includes('Fuel') ? ' L' : ''}</div>
              <div class="card-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    let tableHtml = '';
    if (data.dailyTrend && data.dailyTrend.length > 0) {
      tableHtml = `
        <h3>Daily Attendance Trend</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Late</th>
            </tr>
          </thead>
          <tbody>
            ${data.dailyTrend.slice(0, 20).map(day => `
              <tr>
                <td>${day.date}</td>
                <td>${day.present || 0}</td>
                <td>${day.absent || 0}</td>
                <td>${day.late || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    if (data.busPerformance && data.busPerformance.length > 0) {
      tableHtml += `
        <h3>Bus Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Bus Name</th>
              <th>Trips</th>
              <th>On Time</th>
              <th>Distance (km)</th>
            </tr>
          </thead>
          <tbody>
            ${data.busPerformance.slice(0, 20).map(bus => `
              <tr>
                <td>${bus.name}</td>
                <td>${bus.trips || 0}</td>
                <td>${bus.onTime || 0}</td>
                <td>${bus.distance || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    if (data.topDrivers && data.topDrivers.length > 0) {
      tableHtml += `
        <h3>Top Drivers</h3>
        <table>
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Trips</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            ${data.topDrivers.slice(0, 10).map(driver => `
              <tr>
                <td>${driver.name}</td>
                <td>${driver.trips || 0}</td>
                <td>${driver.rating || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; margin: 0; }
          h1 { color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
          h3 { color: #555; margin: 30px 0 15px 0; }
          .period { color: #666; margin: 20px 0; }
          .summary { display: flex; gap: 20px; margin: 30px 0; flex-wrap: wrap; }
          .card { background: #f5f5f5; padding: 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center; }
          .card-value { font-size: 28px; font-weight: bold; color: #2196F3; }
          .card-label { font-size: 12px; color: #666; margin-top: 5px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th { background: #2196F3; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:hover { background: #f5f5f5; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <div class="period">Period: ${startDate} to ${endDate}</div>
        ${summaryHtml}
        ${tableHtml}
        <div class="footer">
          Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}<br>
          Smart School Transport System
        </div>
      </body>
      </html>
    `;
  };

  const generateReport = async () => {
    if (!reportData) {
      toast.error('Please generate preview first');
      return;
    }

    setLoading(true);
    try {
      const filename = `${reportType}_report_${startDate}_to_${endDate}`;
      let blob;
      let fileExtension;
      let mimeType;
      
      switch(exportFormat) {
        case 'csv':
          const csvContent = convertToCSV(reportData);
          blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
          fileExtension = 'csv';
          mimeType = 'text/csv';
          break;
          
        case 'excel':
          const excelContent = convertToCSV(reportData);
          blob = new Blob(['\uFEFF' + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
          fileExtension = 'xls';
          mimeType = 'application/vnd.ms-excel';
          break;
          
        case 'pdf':
        default:
          const pdfHtml = generatePDFHTML(reportData);
          // Open PDF in new window with print dialog
          const printWindow = window.open('', '_blank');
          printWindow.document.write(pdfHtml);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          toast.success('PDF preview opened. Use browser print to save as PDF.');
          setLoading(false);
          return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Save report to database
  const saveReport = async () => {
    if (!reportData) {
      toast.error('Please generate preview first');
      return;
    }

    try {
      const report = {
        name: `${reportTypes.find(r => r.id === reportType)?.name} - ${startDate} to ${endDate}`,
        type: reportType,
        description: reportTypes.find(r => r.id === reportType)?.description || '',
        dateRange: { start: startDate, end: endDate },
        format: exportFormat,
        data: reportData,
        summary: reportData.summary,
        pages: 1,
        tags: [reportType, 'generated']
      };
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reports/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Failed to save report');
      
      await fetchSavedReports();
      toast.success('Report saved successfully');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error(error.message || 'Failed to save report');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '3px 0', color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Report Configuration */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Generate New Report</h3>
        
        {/* Report Type Selection */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Select Report Type
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px'
          }}>
            {reportTypes.map(type => (
              <div
                key={type.id}
                onClick={() => setReportType(type.id)}
                style={{
                  padding: '15px',
                  background: reportType === type.id ? '#e3f2fd' : '#f8f9fa',
                  border: reportType === type.id ? '2px solid #2196F3' : '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>{type.icon}</div>
                <div style={{ fontWeight: '600', marginBottom: '5px' }}>{type.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Date Range
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {dateRanges.map(range => (
              <button
                key={range.id}
                onClick={() => handleDateRangeChange(range.id)}
                style={{
                  padding: '8px 16px',
                  background: dateRange === range.id ? '#2196F3' : '#f0f0f0',
                  color: dateRange === range.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {range.name}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <span>to</span>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Export Format */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Export Format
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            {['pdf', 'excel', 'csv'].map(format => (
              <label key={format} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={exportFormat === format}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                {format.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={generatePreview}
            disabled={generating}
            style={{
              padding: '12px 24px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {generating ? 'Generating...' : 'Preview Report'}
          </button>
          
          <button
            onClick={generateReport}
            disabled={!previewData || loading}
            style={{
              padding: '12px 24px',
              background: !previewData ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !previewData || loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              opacity: !previewData || loading ? 0.7 : 1
            }}
          >
            {loading ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
          </button>
          
          <button
            onClick={saveReport}
            disabled={!previewData}
            style={{
              padding: '12px 24px',
              background: !previewData ? '#ccc' : '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !previewData ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              opacity: !previewData ? 0.7 : 1
            }}
          >
            Save Report
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {previewData && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          {/* Report Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            paddingBottom: '20px',
            borderBottom: '2px solid #f0f0f0'
          }}>
            <div>
              <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>{previewData.title || `${reportTypes.find(r => r.id === reportType)?.name}`}</h2>
              <p style={{ color: '#666', margin: 0 }}>Period: {startDate} to {endDate}</p>
            </div>
            <div style={{
              background: '#e3f2fd',
              padding: '8px 16px',
              borderRadius: '20px',
              color: '#2196F3',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              PREVIEW MODE
            </div>
          </div>

          {/* Summary Cards */}
          {previewData.summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '15px',
              marginBottom: '30px'
            }}>
              {Object.entries(previewData.summary).map(([key, value]) => (
                <div key={key} style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#666',
                    textTransform: 'capitalize',
                    marginBottom: '8px'
                  }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#2196F3'
                  }}>
                    {value}
                    {key.includes('rate') && '%'}
                    {key.includes('Distance') && ' km'}
                    {key.includes('Fuel') && ' L'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '25px',
            marginBottom: '30px'
          }}>
            {previewData.dailyTrend && (
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Daily Trend</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={previewData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#4CAF50" name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="#f44336" name="Absent" />
                    <Line type="monotone" dataKey="late" stroke="#FF9800" name="Late" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {previewData.byClass && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Class Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={previewData.byClass}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {previewData.byClass.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {previewData.busPerformance && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Bus Performance</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={previewData.busPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trips" fill="#2196F3" />
                    <Bar dataKey="onTime" fill="#4CAF50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {previewData.alertsByType && (
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Alerts by Type</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={previewData.alertsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f44336" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Report Footer */}
          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #eee',
            fontSize: '12px',
            color: '#999',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Generated on: {format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</span>
            <span>Smart School Transport System • Confidential</span>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Recently Saved Reports</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedReports.slice(0, 5).map(report => (
              <div key={report._id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #eee'
              }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>{report.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')} • {report.format?.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setPreviewData(report.data);
                      setReportData(report.data);
                      toast.success('Loading report...');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setReportData(report.data);
                      setExportFormat(report.format || 'pdf');
                      setTimeout(() => generateReport(), 100);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}