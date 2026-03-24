// SMS Provider Configuration
module.exports = {
  // Primary Provider: SMSLeopard (Kenyan provider - affordable)
  smsLeopard: {
    apiKey: '63bs0AbP6SZ34Glk4FlH', // Your SMSLeopard API Key
    baseUrl: 'https://api.smsleopard.com/v1',
    senderId: 'SmartSch', // Your registered sender ID (max 11 chars)
    enabled: true,
    priority: 1 // Highest priority
  },

  // Fallback Provider: TextBee (Free - uses Android phone)
  textBee: {
    apiKey: 'd933d148-0264-44bd-addf-1590919c4ee8', // Your TextBee API Key
    deviceId: null, // Not needed for SMSLeopard
    baseUrl: 'https://api.textbee.dev/api/v1',
    enabled: true,
    priority: 2 // Fallback
  },

  // Provider selection strategy
  strategy: {
    maxRetries: 3,
    retryDelay: 1000, // ms
    fallbackOnFailure: true,
    concurrentProviders: false // Try one at a time
  },

  // SMS Templates for different notification types
  templates: {
    boarding: (studentName, time, busNumber) => 
      `SmartSchool: ${studentName} boarded bus ${busNumber} at ${time}. Track live in the app.`,
    
    alighting: (studentName, time, busNumber) => 
      `SmartSchool: ${studentName} alighted from bus ${busNumber} at ${time}.`,
    
    routeDeviation: (busNumber, eta) => 
      `SmartSchool Alert: Bus ${busNumber} has deviated. New ETA: ${eta}. Track live.`,
    
    delay: (studentName, minutes, reason) => 
      `SmartSchool: ${studentName}'s bus delayed by ${minutes} mins. Reason: ${reason}`,
    
    tripStart: (routeName, busNumber) => 
      `SmartSchool: Trip started on ${routeName} (Bus ${busNumber}). Students will be picked up shortly.`,
    
    tripComplete: (routeName, busNumber) => 
      `SmartSchool: Trip completed on ${routeName} (Bus ${busNumber}). All students arrived safely.`,
    
    emergency: (busNumber, location, description) => 
      `🚨 SmartSchool EMERGENCY: Bus ${busNumber} at ${location}. ${description}. Please check app.`,
    
    driverMessage: (driverName, message) => 
      `SmartSchool: Message from driver ${driverName}: ${message}`,
    
    attendanceReminder: (studentName) => 
      `SmartSchool: Reminder to mark attendance for ${studentName} today.`
  }
};