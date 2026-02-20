import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';

export default function AdvancedFilters({ 
  fields = [], 
  data = [], 
  onFilterChange,
  initialFilters = {},
  savedFilters = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [filterHistory, setFilterHistory] = useState([]);
  const [savedFilterSets, setSavedFilterSets] = useState(savedFilters);

  // Calculate active filters count
  useEffect(() => {
    const count = Object.values(filters).filter(v => 
      v && (Array.isArray(v) ? v.length > 0 : true)
    ).length;
    setActiveFilterCount(count);
  }, [filters]);

  // Memoized filter options
  const filterOptions = useMemo(() => {
    return fields.map(field => ({
      ...field,
      options: field.options || (data ? [...new Set(data.map(item => item[field.key]))] : [])
    }));
  }, [fields, data]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Add to history
    setFilterHistory(prev => [{
      timestamp: new Date(),
      filters: newFilters
    }, ...prev].slice(0, 10));

    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange?.({});
  };

  const saveFilterSet = (name) => {
    const newSet = {
      id: Date.now(),
      name,
      filters,
      createdAt: new Date()
    };
    setSavedFilterSets(prev => [newSet, ...prev]);
  };

  const loadFilterSet = (filterSet) => {
    setFilters(filterSet.filters);
    onFilterChange?.(filterSet.filters);
  };

  const FilterPanel = () => (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '20px',
      marginTop: '10px'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        {filterOptions.map(field => (
          <div key={field.key}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              {field.label}
            </label>

            {field.type === 'select' && (
              <Select
                options={field.options.map(opt => ({ value: opt, label: opt }))}
                value={filters[field.key] ? { 
                  value: filters[field.key], 
                  label: filters[field.key] 
                } : null}
                onChange={(opt) => handleFilterChange(field.key, opt?.value)}
                isClearable
                placeholder={`Select ${field.label}`}
                styles={{
                  control: (base) => ({ ...base, minHeight: '38px' })
                }}
              />
            )}

            {field.type === 'multi-select' && (
              <Select
                isMulti
                options={field.options.map(opt => ({ value: opt, label: opt }))}
                value={filters[field.key]?.map(v => ({ value: v, label: v }))}
                onChange={(opts) => handleFilterChange(
                  field.key, 
                  opts?.map(o => o.value) || []
                )}
                placeholder={`Select ${field.label}`}
              />
            )}

            {field.type === 'date' && (
              <DatePicker
                selected={filters[field.key]}
                onChange={(date) => handleFilterChange(field.key, date)}
                dateFormat="yyyy-MM-dd"
                className="date-picker"
                placeholderText={`Select ${field.label}`}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            )}

            {field.type === 'date-range' && (
              <div style={{ display: 'flex', gap: '5px' }}>
                <DatePicker
                  selected={filters[`${field.key}Start`]}
                  onChange={(date) => handleFilterChange(`${field.key}Start`, date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Start"
                />
                <DatePicker
                  selected={filters[`${field.key}End`]}
                  onChange={(date) => handleFilterChange(`${field.key}End`, date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="End"
                />
              </div>
            )}

            {field.type === 'number-range' && (
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters[`${field.key}Min`] || ''}
                  onChange={(e) => handleFilterChange(
                    `${field.key}Min`, 
                    e.target.value ? Number(e.target.value) : null
                  )}
                  style={{
                    width: '50%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters[`${field.key}Max`] || ''}
                  onChange={(e) => handleFilterChange(
                    `${field.key}Max`, 
                    e.target.value ? Number(e.target.value) : null
                  )}
                  style={{
                    width: '50%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}

            {field.type === 'boolean' && (
              <select
                value={filters[field.key] || ''}
                onChange={(e) => handleFilterChange(
                  field.key, 
                  e.target.value ? e.target.value === 'true' : null
                )}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            )}

            {field.type === 'text' && (
              <input
                type="text"
                placeholder={`Search ${field.label}`}
                value={filters[field.key] || ''}
                onChange={(e) => handleFilterChange(field.key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Saved Filters */}
      {savedFilterSets.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Saved Filters</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {savedFilterSets.map(set => (
              <button
                key={set.id}
                onClick={() => loadFilterSet(set)}
                style={{
                  padding: '5px 10px',
                  background: '#f0f0f0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {set.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter History */}
      {filterHistory.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Recent Filters</h4>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {filterHistory.map((entry, index) => (
              <div
                key={index}
                onClick={() => setFilters(entry.filters)}
                style={{
                  padding: '5px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderBottom: '1px solid #eee'
                }}
              >
                {format(entry.timestamp, 'HH:mm:ss')} - 
                {Object.keys(entry.filters).length} filters
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #eee'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
          <button
            onClick={() => {
              const name = prompt('Enter filter name:');
              if (name) saveFilterSet(name);
            }}
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save Filters
          </button>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: '8px 16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: isOpen || activeFilterCount > 0 ? '#2196F3' : '#f0f0f0',
          color: isOpen || activeFilterCount > 0 ? 'white' : '#333',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <FunnelIcon style={{ width: '18px', height: '18px' }} />
        Filters
        {activeFilterCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#f44336',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          marginTop: '5px',
          minWidth: '600px'
        }}>
          <FilterPanel />
        </div>
      )}
    </div>
  );
}