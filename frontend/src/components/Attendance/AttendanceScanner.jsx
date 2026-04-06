/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect, useCallback } from 'react';
import { attendanceService } from '../../services/attendance';
import { studentService } from '../../services/student';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AttendanceScanner({ currentTripId, onAttendanceRecorded }) {
  const [scanMode, setScanMode] = useState('qr');
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [student, setStudent] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [eventType, setEventType] = useState('board');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    todayTotal: 0,
    boarded: 0,
    alighted: 0
  });
  const [location, setLocation] = useState(null);
  const [qrInput, setQrInput] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          setLocation({ lat: -1.2864, lng: 36.8172 });
        }
      );
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      const data = await transportService.getTrips();
      setTrips(Array.isArray(data) ? data : []);
      if (currentTripId) {
        setSelectedTripId(currentTripId);
      } else {
        const activeTrip = data?.find(t => t.status === 'active' || t.status === 'in-progress');
        if (activeTrip) {
          setSelectedTripId(activeTrip._id);
        }
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    }
  }, [currentTripId]);

  const fetchTodayStats = useCallback(async () => {
    try {
      const statsData = await attendanceService.getTodayAttendance();
      setStats({
        todayTotal: statsData.total || 0,
        boarded: statsData.present || 0,
        alighted: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchRecentScans = useCallback(async () => {
    try {
      const scans = await attendanceService.getTodayAttendance();
      setRecentScans(scans.recentScans || []);
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchTodayStats();
    fetchRecentScans();

    return () => {
      stopCamera();
    };
  }, [fetchTrips, fetchTodayStats, fetchRecentScans]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        toast.success('Camera activated');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, []);

  const processStudentIdentifier = useCallback(async (identifier) => {
    if (!selectedTripId) {
      toast.error('Please select a trip first');
      return;
    }

    setLoading(true);
    
    try {
      let studentData;
      try {
        studentData = await studentService.getStudent(identifier);
      } catch {
        try {
          studentData = await studentService.getStudentByQR?.(identifier);
        } catch {
          studentData = null;
        }
      }
      
      if (!studentData) {
        toast.error('Student not found');
        return;
      }

      setStudent(studentData);
      
      let attendance;
      if (eventType === 'board') {
        attendance = await attendanceService.recordBoarding(selectedTripId, studentData._id, {
          method: scanMode,
          location: location
        });
      } else {
        attendance = await attendanceService.recordAlighting(selectedTripId, studentData._id, {
          method: scanMode,
          location: location
        });
      }
      
      toast.success(`${studentData.firstName} ${studentData.lastName} ${eventType === 'board' ? 'boarded' : 'alighted'} successfully`);
      
      setStudentIdentifier('');
      setStudent(null);
      setQrInput('');
      fetchTodayStats();
      fetchRecentScans();
      
      if (onAttendanceRecorded) {
        onAttendanceRecorded(attendance);
      }
      
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to record attendance');
    } finally {
      setLoading(false);
    }
  }, [selectedTripId, eventType, scanMode, location, fetchTodayStats, fetchRecentScans, onAttendanceRecorded]);

  const handleManualSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!studentIdentifier) {
      toast.error('Please enter student ID or scan QR code');
      return;
    }
    if (!selectedTripId) {
      toast.error('Please select a trip');
      return;
    }
    
    await processStudentIdentifier(studentIdentifier);
    setStudentIdentifier('');
  }, [studentIdentifier, selectedTripId, processStudentIdentifier]);

  const handleQRSubmit = useCallback(async () => {
    if (!qrInput) {
      toast.error('Please enter or scan QR code');
      return;
    }
    if (!selectedTripId) {
      toast.error('Please select a trip');
      return;
    }
    await processStudentIdentifier(qrInput);
    setQrInput('');
  }, [qrInput, selectedTripId, processStudentIdentifier]);

  const getStudentDisplay = () => {
    if (!student) return null;
    return (
      <div style={{
        marginTop: '15px',
        padding: '15px',
        background: '#e8f5e8',
        borderRadius: '8px',
        borderLeft: '4px solid #4CAF50'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          {student.firstName} {student.lastName}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Class: {student.classLevel || 'N/A'} | ID: {student.admissionNumber || student._id}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
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
          QR Scanner
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
          Manual Entry
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>
            {scanMode === 'qr' && 'QR Scanner'}
            {scanMode === 'manual' && 'Manual Entry'}
          </h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Select Trip *
            </label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              required
            >
              <option value="">Choose a trip...</option>
              {trips.map(trip => (
                <option key={trip._id} value={trip._id}>
                  {trip.routeName} - {trip.status} ({trip.startTime ? format(new Date(trip.startTime), 'HH:mm') : 'N/A'})
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
                type="button"
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
                Boarding
              </button>
              <button
                type="button"
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
                Alighting
              </button>
            </div>
          </div>

          {scanMode === 'qr' && (
            <div>
              <div style={{
                width: '100%',
                minHeight: '250px',
                background: '#1a1a1a',
                borderRadius: '8px',
                marginBottom: '15px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: scanning ? 'block' : 'none'
                  }}
                  playsInline
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!scanning && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '250px',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>Camera</div>
                      <p>Camera is off</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                {!scanning ? (
                  <button
                    onClick={startCamera}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Stop Camera
                  </button>
                )}
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Or enter QR code manually:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="Enter QR code value"
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <button
                    onClick={handleQRSubmit}
                    disabled={loading || !qrInput || !selectedTripId}
                    style={{
                      padding: '10px 20px',
                      background: loading || !qrInput || !selectedTripId ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading || !qrInput || !selectedTripId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Processing...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {scanMode === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Student ID / QR Code
                </label>
                <input
                  type="text"
                  value={studentIdentifier}
                  onChange={(e) => setStudentIdentifier(e.target.value)}
                  placeholder="Enter Student ID or QR Code"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  disabled={loading}
                />
              </div>

              {getStudentDisplay()}

              <button
                type="submit"
                disabled={loading || !studentIdentifier || !selectedTripId}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: loading || !studentIdentifier || !selectedTripId ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Processing...' : 'Record Attendance'}
              </button>
            </form>
          )}
        </div>

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

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            background: location ? '#e8f5e8' : '#fff3e0',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '12px'
          }}>
            <span>{location ? 'GPS Active' : 'GPS Waiting...'}</span>
            {location && (
              <span style={{ color: '#666' }}>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            )}
          </div>

          <h4 style={{ margin: '20px 0 10px 0' }}>Recent Scans</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {recentScans.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                No scans yet today
              </div>
            ) : (
              recentScans.map((scan, index) => (
                <div key={scan.id || index} style={{
                  padding: '8px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}>
                  <span>
                    {scan.studentName || scan.studentId?.name || 'Unknown'} - 
                    {scan.type === 'board' ? 'Boarded' : 'Alighted'}
                  </span>
                  <span style={{ color: '#666' }}>
                    {format(new Date(scan.time || scan.createdAt || new Date()), 'HH:mm:ss')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}