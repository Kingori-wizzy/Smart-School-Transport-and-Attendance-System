import { useState, useRef, useEffect } from 'react';
import { attendanceService } from '../../services/attendance';
import { studentService } from '../../services/student';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AttendanceScanner() {
  const [scanMode, setScanMode] = useState('qr'); // qr, manual, rfid
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState(null);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [eventType, setEventType] = useState('board');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState({
    todayTotal: 0,
    boarded: 0,
    alighted: 0
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchBuses();
    fetchTodayStats();
    fetchRecentScans();

    // Simulate QR scanner (in production, use actual QR library)
    if (scanMode === 'qr') {
      startQRScanner();
    }

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanMode]);

  const fetchBuses = async () => {
    const data = await transportService.getBuses();
    setBuses(Array.isArray(data) ? data : []);
  };

  const fetchTodayStats = async () => {
    const stats = await attendanceService.getAttendanceStats();
    setStats({
      todayTotal: stats.total || 0,
      boarded: stats.boardings || 0,
      alighted: stats.alightings || 0
    });
  };

  const fetchRecentScans = async () => {
    const scans = await attendanceService.getTodayAttendance();
    setRecentScans(Array.isArray(scans) ? scans.slice(0, 10) : []);
  };

  const startQRScanner = () => {
    // Mock QR scanner - in production, use react-qr-reader or similar
    setScanning(true);
    toast.success('QR Scanner activated');
  };

  const handleManualScan = async () => {
    if (!studentId || !selectedBus) {
      toast.error('Please enter student ID and select bus');
      return;
    }

    try {
      const studentData = await studentService.getStudent(studentId);
      if (!studentData) {
        toast.error('Student not found');
        return;
      }

      setStudent(studentData);
      
      // Record attendance
      const attendance = await attendanceService.recordAttendance({
        studentId: studentData._id,
        tripId: selectedBus,
        eventType,
        scannerId: 'manual',
        gpsSnapshot: {
          lat: -1.2864, // Would get from actual GPS
          lon: 36.8172
        }
      });

      toast.success(`Attendance recorded: ${studentData.name} ${eventType === 'board' ? 'boarded' : 'alighted'}`);
      
      // Reset form
      setStudentId('');
      setStudent(null);
      fetchTodayStats();
      fetchRecentScans();
      
    } catch (error) {
      toast.error('Failed to record attendance');
    }
  };

  const simulateQRScan = () => {
    // Mock QR scan result
    const mockStudentId = 'STU1001';
    setStudentId(mockStudentId);
    handleManualScan();
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Scanner Mode Selector */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setScanMode('qr')}
          style={{
            padding: '10px 20px',
            background: scanMode === 'qr' ? '#2196F3' : '#f0f0f0',
            color: scanMode === 'qr' ? 'white' : '#333',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📷 QR Scanner
        </button>
        <button
          onClick={() => setScanMode('rfid')}
          style={{
            padding: '10px 20px',
            background: scanMode === 'rfid' ? '#2196F3' : '#f0f0f0',
            color: scanMode === 'rfid' ? 'white' : '#333',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📡 RFID/NFC
        </button>
        <button
          onClick={() => setScanMode('manual')}
          style={{
            padding: '10px 20px',
            background: scanMode === 'manual' ? '#2196F3' : '#f0f0f0',
            color: scanMode === 'manual' ? 'white' : '#333',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⌨️ Manual Entry
        </button>
      </div>

      {/* Scanner Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Left side - Scanner */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>
            {scanMode === 'qr' && '📷 QR Scanner'}
            {scanMode === 'rfid' && '📡 RFID/NFC Scanner'}
            {scanMode === 'manual' && '⌨️ Manual Entry'}
          </h3>

          {scanMode === 'qr' && (
            <div>
              <div style={{
                width: '100%',
                height: '300px',
                background: '#1a1a1a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                marginBottom: '15px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {scanning ? (
                  <>
                    <div style={{
                      position: 'absolute',
                      width: '200px',
                      height: '200px',
                      border: '2px solid #4CAF50',
                      borderRadius: '10px',
                      animation: 'scan 2s linear infinite'
                    }} />
                    <p style={{ color: '#fff', zIndex: 1 }}>Scanning for QR code...</p>
                  </>
                ) : (
                  <button
                    onClick={startQRScanner}
                    style={{
                      padding: '10px 20px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Start Scanner
                  </button>
                )}
              </div>
              <button
                onClick={simulateQRScan}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Simulate QR Scan (Demo)
              </button>
            </div>
          )}

          {scanMode === 'rfid' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: '#e3f2fd',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '40px'
              }}>
                📡
              </div>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Waiting for RFID/NFC tag...
              </p>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#f0f0f0',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '60%',
                  height: '100%',
                  background: '#2196F3',
                  animation: 'progress 1.5s ease-in-out infinite'
                }} />
              </div>
              <button
                onClick={simulateQRScan}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Simulate RFID (Demo)
              </button>
            </div>
          )}

          {scanMode === 'manual' && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Student ID
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter Student ID or Scan"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Select Bus
                </label>
                <select
                  value={selectedBus}
                  onChange={(e) => setSelectedBus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Choose a bus...</option>
                  {buses.map(bus => (
                    <option key={bus._id} value={bus._id}>
                      {bus.busNumber} - {bus.route}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Event Type
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setEventType('board')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: eventType === 'board' ? '#4CAF50' : '#f0f0f0',
                      color: eventType === 'board' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🚶 Boarding
                  </button>
                  <button
                    onClick={() => setEventType('alight')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: eventType === 'alight' ? '#FF9800' : '#f0f0f0',
                      color: eventType === 'alight' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🏁 Alighting
                  </button>
                </div>
              </div>

              <button
                onClick={handleManualScan}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Record Attendance
              </button>
            </div>
          )}
        </div>

        {/* Right side - Today's Stats */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Today's Statistics</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: '#e8f5e8',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
                {stats.boarded}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Boarded</div>
            </div>
            
            <div style={{
              background: '#fff3e0',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF9800' }}>
                {stats.alighted}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Alighted</div>
            </div>
          </div>

          <div style={{
            background: '#e3f2fd',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Events Today</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2196F3' }}>
              {stats.todayTotal}
            </div>
          </div>

          {/* Recent Scans */}
          <h4 style={{ margin: '20px 0 10px 0' }}>Recent Scans</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {recentScans.map((scan, index) => (
              <div key={index} style={{
                padding: '8px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <span>
                  {scan.studentId?.name || 'Unknown'} - 
                  {scan.eventType === 'board' ? '🚶 Boarded' : '🏁 Alighted'}
                </span>
                <span style={{ color: '#666' }}>
                  {format(new Date(scan.createdAt), 'HH:mm:ss')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100px); }
          100% { transform: translateY(100px); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}