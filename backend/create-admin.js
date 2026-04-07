const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: String,
  phone: String,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({ email: 'admin@demo.com' });
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await User.create({
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      phone: '+254712345680',
      isActive: true
    });
    
    console.log('SUCCESS: Admin account created');
    console.log('Email: admin@demo.com');
    console.log('Password: password123');
    console.log('Role: admin');
    
    const verify = await User.findOne({ email: 'admin@demo.com' }).select('+password');
    const works = await bcrypt.compare('password123', verify.password);
    console.log('Login test:', works ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

createAdmin();