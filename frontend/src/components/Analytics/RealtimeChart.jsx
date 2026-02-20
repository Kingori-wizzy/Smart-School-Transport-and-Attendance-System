import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush
} from 'recharts';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { format } from 'date-fns';

export default function RealtimeChart({
  data: initialData = [],
  type = 'line',
  title,
  dataKey = 'value',
  xAxisKey = 'time',
  colors = ['#2196F3', '#4CAF50', '#FF9800', '#f44336'],
  height = 300,
  showBrush = true,
  eventName,
  onDataPointClick,
  aggregateBy = 'minute' // minute, hour, day
}) {
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h, 7d
  const [aggregatedData, setAggregatedData] = useState([]);

  const { data: realtimeData, lastUpdate, isConnected, isLive, setIsLive } = useRealtimeData(
    initialData,
    { eventName, enableAlerts: false }
  );

  // Aggregate data based on time range
  useEffect(() => {
    if (!realtimeData || realtimeData.length === 0) return;

    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = now.getTime() - ranges[timeRange];
    const filtered = realtimeData.filter(item => 
      new Date(item.timestamp || item.time || now).getTime() > cutoff
    );

    // Aggregate by time interval
    const aggregated = {};
    filtered.forEach(item => {
      const date = new Date(item.timestamp || item.time || now);
      let key;
      
      switch(aggregateBy) {
        case 'minute':
          key = format(date, 'HH:mm');
          break;
        case 'hour':
          key = format(date, 'HH:00');
          break;
        case 'day':
          key = format(date, 'MM/dd');
          break;
        default:
          key = format(date, 'HH:mm');
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          [xAxisKey]: key,
          count: 0,
          sum: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity
        };
      }

      const value = item[dataKey] || item.value || 0;
      aggregated[key].count++;
      aggregated[key].sum += value;
      aggregated[key].avg = aggregated[key].sum / aggregated[key].count;
      aggregated[key].min = Math.min(aggregated[key].min, value);
      aggregated[key].max = Math.max(aggregated[key].max, value);
    });

    setAggregatedData(Object.values(aggregated));
  }, [realtimeData, timeRange, dataKey, xAxisKey, aggregateBy]);

  // Memoized chart data
  const chartData = useMemo(() => {
    return timeRange === 'raw' ? realtimeData : aggregatedData;
  }, [realtimeData, aggregatedData, timeRange]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch(type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={index} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colors[0]} 
              fill={`url(#color0)`}
              activeDot={{ r: 8, onClick: onDataPointClick }}
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey={dataKey} 
              fill={colors[0]}
              onClick={onDataPointClick}
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        );
      
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colors[0]} 
              strokeWidth={2}
              dot={{ r: 4, onClick: onDataPointClick }}
              activeDot={{ r: 8, onClick: onDataPointClick }}
              animationDuration={300}
            />
            <Line 
              type="monotone" 
              dataKey="avg" 
              stroke={colors[1]} 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        );
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span style={{
            padding: '4px 8px',
            background: isConnected ? '#4CAF50' : '#f44336',
            color: 'white',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {isConnected ? '🟢 LIVE' : '🔴 OFFLINE'}
          </span>
          {lastUpdate && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              Last: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '5px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="raw">Raw Data</option>
          </select>

          <button
            onClick={() => setIsLive(!isLive)}
            style={{
              padding: '5px 10px',
              background: isLive ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isLive ? '⏸️ Pause' : '▶️ Live'}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>

      {showBrush && chartData.length > 20 && (
        <ResponsiveContainer width="100%" height={60}>
          <AreaChart data={chartData}>
            <Brush dataKey={xAxisKey} height={30} stroke="#2196F3" />
            <Area type="monotone" dataKey={dataKey} stroke="#2196F3" fill="#2196F3" />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Points: {chartData.length}</span>
        <span>Updated: {format(new Date(), 'HH:mm:ss')}</span>
      </div>
    </div>
  );
}