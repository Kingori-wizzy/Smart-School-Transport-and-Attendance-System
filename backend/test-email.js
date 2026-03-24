require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  console.log('📧 Testing Email Service\n');
  console.log('='.repeat(50));
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('');

  const result = await emailService.testEmail();
  
  if (result.success) {
    console.log('\n✅ Email sent successfully!');
    console.log('   Check your inbox at:', process.env.EMAIL_USER);
  } else {
    console.log('\n❌ Email failed:', result.error);
  }
}

testEmail();