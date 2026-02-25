const sharp = require('sharp');

// Create a simple colored icon
sharp({
  create: {
    width: 96,
    height: 96,
    channels: 4,
    background: { r: 102, g: 126, b: 234, alpha: 1 }
  }
})
.png()
.toFile('notification-icon.png')
.then(() => console.log('✅ notification-icon.png created successfully'))
.catch(err => console.error('Error creating icon:', err));
