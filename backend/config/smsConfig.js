// SMS Provider Configuration
module.exports = {
  // Primary Provider: SMSLeopard (Kenyan provider - affordable)
  smsLeopard: {
    apiKey: process.env.SMSLEOPARD_API_KEY,
    baseUrl: 'https://api.smsleopard.com/v1',
    senderId: process.env.SMS_SENDER_ID || 'SmartSchool', // Your registered sender ID
    enabled: true,
    priority: 1 // Highest priority
  },

  // Fallback Provider: TextBee (Free - uses Android phone)
  textBee: {
    apiKey: process.env.TEXTBEE_API_KEY,
    deviceId: process.env.TEXTBEE_DEVICE_ID,
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
    boarding: (studentName, time) => 
      `${studentName} has boarded the school bus at ${time}. Track live in the app.`,
    
    alighting: (studentName, time) => 
      `${studentName} has alighted from the bus at ${time}.`,
    
    routeDeviation: (busNumber, eta) => 
      `Alert: Bus ${busNumber} has deviated from route. New ETA: ${eta}. Track live in app.`,
    
    delay: (studentName, minutes) => 
      `${studentName}'s bus is delayed by approximately ${minutes} minutes.`,
    
    emergency: (busNumber, location) => 
      `🚨 EMERGENCY ALERT: Bus ${busNumber} has reported an emergency at ${location}.`
  }
};