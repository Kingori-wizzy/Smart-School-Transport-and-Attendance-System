import { useState, useEffect } from 'react';
import api from '../services/api';

export const useTrip = (tripId) => {
  const [trip, setTrip] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    boarded: 0,
    remaining: 0,
    progress: 0,
  });

  useEffect(() => {
    if (tripId) {
      loadTripData();
    }
  }, [tripId]);

  const loadTripData = async () => {
    try {
      setLoading(true);
      const [tripData, studentsData] = await Promise.all([
        api.driver.getTripDetails(tripId),
        api.driver.getTripStudents(tripId),
      ]);
      
      setTrip(tripData);
      setStudents(studentsData);
      calculateStats(studentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentsList) => {
    const boarded = studentsList.filter(s => s.boarded).length;
    setStats({
      totalStudents: studentsList.length,
      boarded,
      remaining: studentsList.length - boarded,
      progress: studentsList.length > 0 ? (boarded / studentsList.length) * 100 : 0,
    });
  };

  const boardStudent = async (studentId, method = 'qr') => {
    try {
      const result = await api.trip.boardStudent(tripId, studentId, method);
      if (result.success) {
        const updatedStudents = students.map(s =>
          s.id === studentId ? { ...s, boarded: true } : s
        );
        setStudents(updatedStudents);
        calculateStats(updatedStudents);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  };

  const refresh = () => loadTripData();

  return {
    trip,
    students,
    loading,
    error,
    stats,
    boardStudent,
    refresh,
  };
};