const fs = require('fs');
const selfsigned = require('selfsigned');

// Generate certificate
const attrs = [{ name: 'commonName', value: '122.165.58.206' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// Create ssl directory
if (!fs.existsSync('./ssl')) {
  fs.mkdirSync('./ssl');
}

// Save certificate and key
fs.writeFileSync('./ssl/server.key', pems.private);
fs.writeFileSync('./ssl/server.crt', pems.cert);

console.log('✅ SSL certificates generated in ./ssl/ directory');
console.log('📁 Files created:');
console.log('   - ssl/server.key');
console.log('   - ssl/server.crt');