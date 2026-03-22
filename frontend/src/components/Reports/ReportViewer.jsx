/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ReportViewer({ reports: externalReports, loading: externalLoading, onDelete, onRefresh }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use external props if provided, otherwise fetch internally
  const useExternalData = externalReports !== undefined;

  useEffect(() => {
    if (!useExternalData) {
      fetchReports();
    } else {
      setReports(externalReports || []);
      setLoading(externalLoading || false);
    }
  }, [useExternalData, externalReports, externalLoading]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data || []);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'attendance': return '📊';
      case 'transport': return '🚌';
      case 'drivers': return '👤';
      case 'routes': return '🗺️';
      case 'alerts': return '⚠️';
      default: return '📄';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'attendance': return '#4CAF50';
      case 'transport': return '#2196F3';
      case 'drivers': return '#FF9800';
      case 'routes': return '#9C27B0';
      case 'alerts': return '#f44336';
      default: return '#666';
    }
  };

  const getFormatIcon = (format) => {
    switch(format) {
      case 'pdf': return '📕';
      case 'excel': return '📗';
      case 'csv': return '📘';
      default: return '📄';
    }
  };

  const handleView = (report) => {
    setSelectedReport(report);
  };

  const handleDownload = async (report) => {
    try {
      // Create a simple text/CSV download as fallback since exportService is removed
      const data = report.data || report;
      let content = '';
      let filename = `${report.name || 'report'}.${report.format || 'pdf'}`;
      
      if (report.format === 'csv') {
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(row => Object.values(row).join(',')).join('\n');
          content = `${headers}\n${rows}`;
        } else {
          content = JSON.stringify(data, null, 2);
        }
      } else {
        content = JSON.stringify(data, null, 2);
        filename = `${report.name || 'report'}.json`;
      }
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloading ${report.name}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      if (onDelete) {
        await onDelete(id);
        if (!useExternalData) {
          setReports(reports.filter(r => r.id !== id));
        }
      } else {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/reports/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete report');
        setReports(reports.filter(r => r.id !== id));
      }
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'Failed to delete report');
    }
  };

  const handleShare = (report) => {
    const shareUrl = `${window.location.origin}/reports/${report.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(`Share link copied for ${report.name}`);
  };

  const handlePrint = (report) => {
    const printContent = document.getElementById(`report-${report.id}`);
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${report.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th { background: #2196F3; color: white; padding: 10px; text-align: left; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              .header { text-align: center; margin-bottom: 20px; }
              .date { color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${report.name}</h1>
              <p class="date">Generated: ${format(new Date(report.createdAt), 'MMMM dd, yyyy HH:mm:ss')}</p>
            </div>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success(`Printing ${report.name}`);
    } else {
      // Fallback if element not found
      toast.info(`Preview ${report.name} for printing`);
    }
  };

  const filteredReports = reports
    .filter(report => {
      const matchesSearch = report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || report.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Filters */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Saved Reports</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '15px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="🔍 Search reports by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              width: '100%'
            }}
          />
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minWidth: '150px'
            }}
          >
            <option value="all">All Types</option>
            <option value="attendance">Attendance</option>
            <option value="transport">Transport</option>
            <option value="drivers">Drivers</option>
            <option value="routes">Routes</option>
            <option value="alerts">Alerts</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minWidth: '150px'
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          {filteredReports.length} report(s) found
        </div>
      </div>

      {/* Reports Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {filteredReports.map(report => (
          <div
            key={report.id}
            id={`report-${report.id}`}
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, boxShadow 0.3s ease',
              cursor: 'pointer',
              border: selectedReport?.id === report.id ? '2px solid #2196F3' : 'none'
            }}
            onClick={() => handleView(report)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            {/* Report Header with Color Bar */}
            <div style={{
              height: '8px',
              background: getTypeColor(report.type)
            }} />

            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: `${getTypeColor(report.type)}20`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  {getTypeIcon(report.type)}
                </div>
                <div style={{
                  padding: '4px 12px',
                  background: '#f0f0f0',
                  borderRadius: '20px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{getFormatIcon(report.format)}</span>
                  <span>{(report.format || 'pdf').toUpperCase()}</span>
                </div>
              </div>

              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                {report.name}
              </h4>
              
              <p style={{
                margin: '0 0 15px 0',
                fontSize: '13px',
                color: '#666',
                lineHeight: '1.5'
              }}>
                {report.description || 'No description'}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#888',
                marginBottom: '15px',
                paddingBottom: '15px',
                borderBottom: '1px solid #eee'
              }}>
                <span>📅 {format(new Date(report.createdAt), 'MMM dd, yyyy')}</span>
                <span>⏱️ {format(new Date(report.createdAt), 'HH:mm')}</span>
                <span>📄 {report.pages || 1} pages</span>
              </div>

              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(report);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  👁️ View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(report);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Download
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(report);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📤
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(report.id);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Preview Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '15px',
            width: '800px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>{selectedReport.name}</h2>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  {selectedReport.description || 'No description'}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px 10px',
                  borderRadius: '5px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                ✕
              </button>
            </div>

            {/* Report Preview Content */}
            <div style={{
              background: '#f8f9fa',
              padding: '30px',
              borderRadius: '10px',
              marginBottom: '20px',
              minHeight: '400px',
              border: '1px solid #eee'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                  {getTypeIcon(selectedReport.type)}
                </div>
                <h3 style={{ margin: '0 0 10px 0', color: '#555' }}>Report Preview</h3>
                <p style={{ color: '#888', marginBottom: '20px' }}>
                  This is a preview of the {selectedReport.name}.<br />
                  The actual report contains detailed data from the system.
                </p>
                
                {/* Mock Report Content */}
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Report Details:</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>📅 Date: {format(new Date(selectedReport.createdAt), 'MMMM dd, yyyy')}</div>
                    <div>⏱️ Time: {format(new Date(selectedReport.createdAt), 'HH:mm:ss')}</div>
                    <div>📊 Type: {selectedReport.type}</div>
                    <div>📁 Format: {(selectedReport.format || 'pdf').toUpperCase()}</div>
                    <div>📄 Pages: {selectedReport.pages || 1}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handlePrint(selectedReport)}
                style={{
                  padding: '12px 24px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🖨️ Print
              </button>
              <button
                onClick={() => handleDownload(selectedReport)}
                style={{
                  padding: '12px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📥 Download PDF
              </button>
              <button
                onClick={() => handleShare(selectedReport)}
                style={{
                  padding: '12px 24px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📤 Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>📭</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>No Reports Found</h3>
          <p style={{ color: '#888' }}>
            No reports match your search criteria. Try adjusting your filters or generate a new report.
          </p>
        </div>
      )}
    </div>
  );
}