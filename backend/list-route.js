const fs = require('fs');
const path = require('path');

console.log('📋 Available routes in your backend:\n');

const routesDir = './routes';
if (fs.existsSync(routesDir)) {
  const files = fs.readdirSync(routesDir);
  files.forEach(file => {
    console.log(`\n📄 ${file}:`);
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const matches = content.match(/router\.(get|post|put|delete)\(['"]([^'"]+)/g);
    if (matches) {
      matches.forEach(match => {
        const method = match.split('(')[0].replace('router.', '');
        const route = match.split(/['"]/)[1];
        console.log(`   ${method.toUpperCase()} ${route}`);
      });
    }
  });
} else {
  console.log('❌ Routes folder not found');
}