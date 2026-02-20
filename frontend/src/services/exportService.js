import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

class ExportService {
  // Export to CSV
  exportToCSV(data, filename, headers) {
    try {
      // Convert data to CSV format
      const csvContent = this.convertToCSV(data, headers);
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      
      return { success: true, message: 'CSV exported successfully' };
    } catch (error) {
      console.error('CSV Export Error:', error);
      return { success: false, message: 'Failed to export CSV' };
    }
  }

  // Export to Excel
  exportToExcel(data, filename, sheetName = 'Sheet1') {
    try {
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate buffer and save
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      
      return { success: true, message: 'Excel exported successfully' };
    } catch (error) {
      console.error('Excel Export Error:', error);
      return { success: false, message: 'Failed to export Excel' };
    }
  }

  // Export to PDF
  exportToPDF(data, filename, options = {}) {
    try {
      const {
        title = 'Report',
        orientation = 'portrait',
        unit = 'pt',
        format = 'a4',
        headers = [],
        columns = []
      } = options;

      // Create PDF document
      const doc = new jsPDF({ orientation, unit, format });
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(33, 33, 33);
      doc.text(title, 40, 40);
      
      // Add date
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}`, 40, 55);
      
      // Add line
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(40, 65, doc.internal.pageSize.width - 40, 65);

      // Prepare data for table
      let tableData = [];
      let tableHeaders = [];

      if (headers.length > 0 && columns.length > 0) {
        tableHeaders = headers;
        tableData = data.map(item => columns.map(col => item[col] || ''));
      } else {
        // Auto-detect columns from first item
        if (data.length > 0) {
          tableHeaders = Object.keys(data[0]);
          tableData = data.map(item => Object.values(item));
        }
      }

      // Add table
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 80,
        styles: {
          fontSize: 9,
          cellPadding: 5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [33, 150, 243],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 80 }
      });

      // Add summary at the end
      const finalY = doc.lastAutoTable.finalY || 80;
      doc.setFontSize(10);
      doc.setTextColor(33, 33, 33);
      doc.text(`Total Records: ${data.length}`, 40, finalY + 20);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - 40, finalY + 20);

      // Save PDF
      doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
      
      return { success: true, message: 'PDF exported successfully' };
    } catch (error) {
      console.error('PDF Export Error:', error);
      return { success: false, message: 'Failed to export PDF' };
    }
  }

  // Export multiple sheets Excel
  exportMultiSheetExcel(sheets, filename) {
    try {
      const wb = XLSX.utils.book_new();
      
      sheets.forEach(({ name, data }) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      
      return { success: true, message: 'Multi-sheet Excel exported successfully' };
    } catch (error) {
      console.error('Multi-sheet Excel Export Error:', error);
      return { success: false, message: 'Failed to export multi-sheet Excel' };
    }
  }

  // Export as JSON
  exportToJSON(data, filename) {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      saveAs(blob, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
      
      return { success: true, message: 'JSON exported successfully' };
    } catch (error) {
      console.error('JSON Export Error:', error);
      return { success: false, message: 'Failed to export JSON' };
    }
  }

  // Convert data to CSV
  convertToCSV(data, headers) {
    if (!data || data.length === 0) return '';
    
    const array = typeof data !== 'object' ? JSON.parse(data) : data;
    let csv = '';
    
    // Add headers
    if (headers && headers.length > 0) {
      csv = headers.join(',') + '\n';
    } else {
      csv = Object.keys(array[0]).join(',') + '\n';
    }
    
    // Add data
    array.forEach(item => {
      let row = [];
      if (headers && headers.length > 0) {
        // Use headers as keys
        headers.forEach(header => {
          row.push(this.formatCSVField(item[header]));
        });
      } else {
        // Use all keys
        Object.values(item).forEach(value => {
          row.push(this.formatCSVField(value));
        });
      }
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  // Format field for CSV
  formatCSVField(field) {
    if (field === null || field === undefined) return '';
    
    let stringField = String(field);
    
    // Escape quotes and wrap in quotes if contains comma or quote
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      stringField = stringField.replace(/"/g, '""');
      return `"${stringField}"`;
    }
    
    return stringField;
  }

  // Print report
  printReport(elementId, title = 'Report') {
    try {
      const printContent = document.getElementById(elementId);
      if (!printContent) {
        throw new Error('Element not found');
      }

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th { background: #2196F3; color: white; padding: 10px; text-align: left; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              .header { text-align: center; margin-bottom: 20px; }
              .date { color: #666; font-size: 12px; }
              @media print {
                .no-print { display: none; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <p class="date">Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
            </div>
            ${printContent.innerHTML}
            <div style="text-align: right; margin-top: 20px;">
              <p>Page 1 of 1</p>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      
      return { success: true, message: 'Print window opened' };
    } catch (error) {
      console.error('Print Error:', error);
      return { success: false, message: 'Failed to print' };
    }
  }
}

export default new ExportService();