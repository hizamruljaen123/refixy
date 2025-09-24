const { Client } = require('basic-ftp');

async function testFTP() {
  const client = new Client();
  try {
    await client.access({
      host: 'assetacademy.id',
      port: 2078,
      user: 'aksesdata@assetacademy.id',
      password: 'komputer123@@',
      secure: true
    });
    console.log('FTP connection SUCCESS');
    return true;
  } catch (error) {
    console.error('FTP connection FAILED:', error.message);
    return false;
  } finally {
    client.close();
  }
}

testFTP();
