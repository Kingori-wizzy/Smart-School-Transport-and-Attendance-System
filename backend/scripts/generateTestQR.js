const QRCode = require('qrcode');

const students = [
  { id: 'STU001', name: 'John Junior', class: '5A' },
  { id: 'STU002', name: 'Jane Junior', class: '3B' },
  { id: 'STU003', name: 'Bob Smith', class: '4C' },
];

async function generateQRs() {
  for (const student of students) {
    const qrData = JSON.stringify({
      studentId: student.id,
      name: student.name,
      class: student.class
    });
    
    const filename = `qr-${student.name.replace(' ', '-')}.png`;
    await QRCode.toFile(filename, qrData);
    console.log(`✅ Generated QR for ${student.name}: ${filename}`);
  }
  console.log('\n📱 Scan these QR codes with the driver app to test boarding!');
}

generateQRs().catch(console.error);