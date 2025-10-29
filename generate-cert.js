const fs = require('fs');
const selfsigned = require('selfsigned');
const path = require('path');

// Generate certificate with proper attributes
const attrs = [
  { name: 'commonName', value: '122.165.58.206' },
  { name: 'countryName', value: 'IN' },
  { name: 'stateOrProvinceName', value: 'Tamil Nadu' },
  { name: 'localityName', value: 'Chennai' },
  { name: 'organizationName', value: 'FindHire' }
];

const options = {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 7, // IP
          ip: '122.165.58.206'
        },
        {
          type: 2, // DNS
          value: 'localhost'
        },
        {
          type: 7, // IP
          ip: '127.0.0.1'
        }
      ]
    }
  ]
};

console.log('🔐 Generating SSL certificate...');

try {
  const pems = selfsigned.generate(attrs, options);

  // Create ssl directory
  if (!fs.existsSync('./ssl')) {
    fs.mkdirSync('./ssl');
  }

  // Save certificate and key
  fs.writeFileSync('./ssl/server.key', pems.private);
  fs.writeFileSync('./ssl/server.crt', pems.cert);

  console.log('✅ SSL certificates generated successfully!');
  console.log('📁 Files created:');
  console.log('   - ssl/server.key');
  console.log('   - ssl/server.crt');
  console.log('');
  console.log('📋 Certificate details:');
  console.log('   - Common Name: 122.165.58.206');
  console.log('   - Valid for: 365 days');
  console.log('   - Key size: 2048 bits');
  console.log('   - Algorithm: SHA-256');
  console.log('');
  console.log('⚠️  Note: This is a self-signed certificate.');
  console.log('   Users will see a security warning in their browser.');
  console.log('   They must visit https://122.165.58.206:5550/health');
  console.log('   and accept the warning before using the app.');
} catch (error) {
  console.error('❌ Error generating certificate:', error.message);
  process.exit(1);
}