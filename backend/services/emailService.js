const nodemailer = require('nodemailer');

// Configure your email settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email templates
const templates = {
  boarding: (studentName, time, busNumber) => ({
    subject: `🚌 ${studentName} has boarded the bus`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🚌 Boarding Alert</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <p style="font-size: 16px;"><strong>${studentName}</strong> has boarded the school bus.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>🚍 Bus Number:</strong> ${busNumber}</p>
            <p><strong>⏰ Time:</strong> ${time}</p>
          </div>
          <p>Track your child's location in real-time through the Smart School app.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `${studentName} has boarded the bus (${busNumber}) at ${time}. Track live in the Smart School app.`
  }),
  
  alighting: (studentName, time, busNumber) => ({
    subject: `🏠 ${studentName} has alighted from the bus`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🏠 Alighting Alert</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <p style="font-size: 16px;"><strong>${studentName}</strong> has alighted from the school bus.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>🚍 Bus Number:</strong> ${busNumber}</p>
            <p><strong>⏰ Time:</strong> ${time}</p>
          </div>
          <p>Your child has arrived safely.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `${studentName} has alighted from the bus (${busNumber}) at ${time}.`
  }),
  
  tripStart: (routeName, busNumber, estimatedArrival) => ({
    subject: `🚍 Trip Started: ${routeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🚍 Trip Started</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <p>The bus on route <strong>${routeName}</strong> has started its journey.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>🚍 Bus Number:</strong> ${busNumber}</p>
            <p><strong>⏰ Estimated Arrival:</strong> ${estimatedArrival}</p>
          </div>
          <p>Track the bus location in the Smart School app.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `Trip started on ${routeName} (Bus ${busNumber}). Track live in the Smart School app.`
  }),
  
  tripComplete: (routeName, busNumber) => ({
    subject: `✅ Trip Completed: ${routeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">✅ Trip Completed</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <p>The bus on route <strong>${routeName}</strong> has completed its journey.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>🚍 Bus Number:</strong> ${busNumber}</p>
          </div>
          <p>All students have arrived safely.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `Trip completed on ${routeName} (Bus ${busNumber}). All students arrived safely.`
  }),
  
  delay: (studentName, minutes, reason) => ({
    subject: `⏰ Bus Delay Alert for ${studentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">⏰ Delay Alert</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <p><strong>${studentName}</strong>'s bus is delayed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>⏰ Delay:</strong> ${minutes} minutes</p>
            <p><strong>📝 Reason:</strong> ${reason}</p>
          </div>
          <p>We apologize for the inconvenience. Track the bus location in the app.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `${studentName}'s bus is delayed by ${minutes} minutes. Reason: ${reason}. Track live in the app.`
  }),
  
  emergency: (busNumber, location, description) => ({
    subject: `🚨 EMERGENCY ALERT - Bus ${busNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff3f3;">
        <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <p><strong>Emergency situation reported on Bus ${busNumber}</strong></p>
          <div style="background-color: #fff3f3; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p><strong>📍 Location:</strong> ${location}</p>
            <p><strong>📝 Details:</strong> ${description}</p>
          </div>
          <p>Please check the Smart School app for updates.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `EMERGENCY on Bus ${busNumber} at ${location}. ${description}. Check the app for updates.`
  }),
  
  driverMessage: (driverName, message) => ({
    subject: `📢 Message from Driver ${driverName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📢 Message from Driver</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Dear Parent,</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${driverName}</p>
            <p><strong>Message:</strong></p>
            <p style="font-style: italic;">${message}</p>
          </div>
          <p>Reply in the Smart School app.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
        </div>
      </div>
    `,
    text: `Message from driver ${driverName}: ${message}`
  })
};

/**
 * Send email with HTML and plain text fallback
 */
const sendEmail = async (to, subject, html, text = null) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Skipping email send.');
      return { success: false, error: 'Email not configured' };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };
    
    if (text) {
      mailOptions.text = text;
    }

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return { success: true, to };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send email using a template
 */
const sendTemplateEmail = async (to, templateName, params) => {
  const template = templates[templateName];
  if (!template) {
    console.error(`Template "${templateName}" not found`);
    return { success: false, error: 'Template not found' };
  }
  
  const { subject, html, text } = template(...params);
  return await sendEmail(to, subject, html, text);
};

/**
 * Send parent notification based on event type
 */
const sendParentNotification = async (parent, eventType, data) => {
  if (!parent || !parent.email) {
    console.log(`No email for parent ${parent?._id}`);
    return { success: false, error: 'No email address' };
  }
  
  let templateName;
  let params;
  
  switch (eventType) {
    case 'board':
      templateName = 'boarding';
      params = [data.studentName, data.time, data.busNumber];
      break;
    case 'alight':
      templateName = 'alighting';
      params = [data.studentName, data.time, data.busNumber];
      break;
    case 'delay':
      templateName = 'delay';
      params = [data.studentName, data.minutes, data.reason];
      break;
    case 'trip_start':
      templateName = 'tripStart';
      params = [data.routeName, data.busNumber, data.estimatedArrival || 'Track in app'];
      break;
    case 'trip_end':
      templateName = 'tripComplete';
      params = [data.routeName, data.busNumber];
      break;
    case 'emergency':
      templateName = 'emergency';
      params = [data.busNumber, data.location, data.description];
      break;
    case 'driver_message':
      templateName = 'driverMessage';
      params = [data.driverName, data.message];
      break;
    default:
      return { success: false, error: `Unknown event type: ${eventType}` };
  }
  
  return await sendTemplateEmail(parent.email, templateName, params);
};

/**
 * Send bulk notifications to multiple parents
 */
const sendBulkNotifications = async (parents, eventType, data) => {
  const results = [];
  for (const parent of parents) {
    const result = await sendParentNotification(parent, eventType, data);
    results.push({ email: parent.email, success: result.success, error: result.error });
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return results;
};

/**
 * Test email configuration
 */
const testEmail = async () => {
  console.log('📧 Testing email configuration...');
  const result = await sendEmail(
    process.env.EMAIL_USER,
    'Smart School Test',
    '<h1>Test</h1><p>Email service is working!</p>',
    'Email service is working!'
  );
  console.log(result.success ? '✅ Email test successful' : '❌ Email test failed');
  return result;
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendParentNotification,
  sendBulkNotifications,
  testEmail,
  templates
};