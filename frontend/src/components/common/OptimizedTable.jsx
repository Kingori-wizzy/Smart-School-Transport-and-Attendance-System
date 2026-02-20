import { useState, useMemo, useCallback, memo } from 'react';
import { useVirtualList, useDebounce } from '../../hooks/usePerformance';

const TableRow = memo(({ item, columns, index }) => (
  <tr style={{
    background: index % 2 === 0 ? '#f8f9fa' : 'white',
    transition: 'background 0.3s ease'
  }}>
    {columns.map(col => (
      <td key={col.key} style={{ padding: '12px' }}>
        {col.render ? col.render(item[col.key], item) : item[col.key]}
      </td>
    ))}
  </tr>
));

TableRow.displayName = 'TableRow';

export default function OptimizedTable({
  data = [],
  columns = [],
  pageSize = 20,
  height = 400,
  onRowClick,
  loading = false
}) {
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Memoized sorted and filtered data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (debouncedSearch) {
      result = result.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortOrder === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, sortBy, sortOrder, debouncedSearch]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Virtual list for large datasets
  const { visibleItems, totalHeight, onScroll } = useVirtualList(
    paginatedData,
    50,
    height
  );

  const handleSort = useCallback((key) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Table Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          height: height - 60
        }}
        onScroll={onScroll}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            position: 'relative',
            height: totalHeight
          }}>
            <thead style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      cursor: col.sortable !== false ? 'pointer' : 'default',
                      background: '#f5f5f5',
                      borderBottom: '2px solid #ddd'
                    }}
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span style={{ marginLeft: '5px' }}>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(({ item, index, style }) => (
                <TableRow
                  key={item.id || index}
                  item={item}
                  columns={columns}
                  index={index}
                  onClick={() => onRowClick?.(item)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          marginTop: '15px',
          display: 'flex',
          justifyContent: 'center',
          gap: '5px'
        }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#f5f5f5' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            «
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#f5f5f5' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ‹
          </button>
          
          <span style={{ padding: '6px 12px' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#f5f5f5' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            ›
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#f5f5f5' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}