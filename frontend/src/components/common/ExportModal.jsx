import { useState } from 'react';
import exportService from '../../services/exportService';
import toast from 'react-hot-toast';

export default function ExportModal({ isOpen, onClose, data, title, filename, columns }) {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    
    let result;
    const options = {
      title,
      headers: includeHeaders ? columns?.map(c => c.header) : [],
      columns: includeHeaders ? columns?.map(c => c.key) : []
    };

    switch (exportFormat) {
      case 'csv':
        result = exportService.exportToCSV(data, filename, options.headers);
        break;
      case 'excel':
        result = exportService.exportToExcel(data, filename, title);
        break;
      case 'pdf':
        result = exportService.exportToPDF(data, filename, options);
        break;
      case 'json':
        result = exportService.exportToJSON(data, filename);
        break;
      default:
        result = { success: false, message: 'Invalid format' };
    }

    if (result.success) {
      toast.success(result.message);
      onClose();
    } else {
      toast.error(result.message);
    }
    
    setExporting(false);
  };

  return (
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
        borderRadius: '12px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Export Report</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Export Format
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px'
            }}
          >
            <option value="pdf">PDF Document</option>
            <option value="excel">Excel Spreadsheet</option>
            <option value="csv">CSV File</option>
            <option value="json">JSON Data</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={includeHeaders}
              onChange={(e) => setIncludeHeaders(e.target.checked)}
            />
            Include Headers
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={includeSummary}
              onChange={(e) => setIncludeSummary(e.target.checked)}
            />
            Include Summary Statistics
          </label>
        </div>

        <div style={{
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
            Export Details:
          </div>
          <div style={{ fontSize: '14px' }}>
            <div>📄 Filename: {filename}_{new Date().toISOString().slice(0,10)}</div>
            <div>📊 Records: {data.length}</div>
            <div>📁 Format: {exportFormat.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              flex: 1,
              padding: '12px',
              background: exporting ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: exporting ? 'not-allowed' : 'pointer'
            }}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}