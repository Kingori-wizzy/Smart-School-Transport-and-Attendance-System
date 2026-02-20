import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ReportViewer() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  // Mock saved reports
  const [reports, setReports] = useState([
    {
      id: 1,
      name: 'Attendance Report - Weekly Summary',
      type: 'attendance',
      date: '2024-02-19T10:30:00',
      format: 'pdf',
      size: '2.4 MB',
      createdBy: 'Admin',
      description: 'Weekly attendance summary for all grades',
      pages: 12,
      downloads: 45
    },
    {
      id: 2,
      name: 'Transport Report - February 2024',
      type: 'transport',
      date: '2024-02-18T14:20:00',
      format: 'excel',
      size: '1.8 MB',
      createdBy: 'Admin',
      description: 'Monthly transport operations report including bus utilization and trip logs',
      pages: 8,
      downloads: 32
    },
    {
      id: 3,
      name: 'Driver Performance - Q1 2024',
      type: 'drivers',
      date: '2024-02-17T09:15:00',
      format: 'pdf',
      size: '3.1 MB',
      createdBy: 'Admin',
      description: 'Quarterly driver performance evaluation with safety scores',
      pages: 15,
      downloads: 28
    },
    {
      id: 4,
      name: 'Route Efficiency Analysis',
      type: 'routes',
      date: '2024-02-16T11:45:00',
      format: 'csv',
      size: '956 KB',
      createdBy: 'Admin',
      description: 'Route efficiency and optimization analysis with recommendations',
      pages: 6,
      downloads: 19
    },
    {
      id: 5,
      name: 'Alerts & Incidents - February',
      type: 'alerts',
      date: '2024-02-15T16:30:00',
      format: 'pdf',
      size: '1.2 MB',
      createdBy: 'Admin',
      description: 'Monthly incident and alert summary with resolution times',
      pages: 10,
      downloads: 23
    }
  ]);

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

  const handleDownload = (report) => {
    toast.success(`Downloading ${report.name} (${report.size})`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setReports(reports.filter(r => r.id !== id));
      toast.success('Report deleted successfully');
    }
  };

  const handleShare = (report) => {
    navigator.clipboard.writeText(`https://smarttransport.com/reports/${report.id}`);
    toast.success(`Share link copied for ${report.name}`);
  };

  const handlePrint = (report) => {
    window.print();
    toast.success(`Printing ${report.name}`);
  };

  const filteredReports = reports
    .filter(report => {
      const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || report.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        return b.size.localeCompare(a.size);
      }
      return 0;
    });

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
            <option value="size">Sort by Size</option>
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
                  <span>{report.format.toUpperCase()}</span>
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
                {report.description}
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
                <span>📅 {format(new Date(report.date), 'MMM dd, yyyy')}</span>
                <span>⏱️ {format(new Date(report.date), 'HH:mm')}</span>
                <span>📦 {report.size}</span>
                <span>📄 {report.pages} pages</span>
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

              <div style={{
                marginTop: '10px',
                fontSize: '11px',
                color: '#999',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Created by: {report.createdBy}</span>
                <span>📥 {report.downloads} downloads</span>
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
                  {selectedReport.description}
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
                  The actual report would be displayed here in {selectedReport.format.toUpperCase()} format.
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
                    <div>📅 Date: {format(new Date(selectedReport.date), 'MMMM dd, yyyy')}</div>
                    <div>⏱️ Time: {format(new Date(selectedReport.date), 'HH:mm:ss')}</div>
                    <div>📊 Type: {selectedReport.type}</div>
                    <div>📁 Format: {selectedReport.format.toUpperCase()}</div>
                    <div>📦 Size: {selectedReport.size}</div>
                    <div>📄 Pages: {selectedReport.pages}</div>
                    <div>👤 Created By: {selectedReport.createdBy}</div>
                    <div>📥 Downloads: {selectedReport.downloads}</div>
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
                📥 Download {selectedReport.format.toUpperCase()}
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