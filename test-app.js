const http = require('http');

// Test if the web app is running
function testWebApp() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Web app is running! Status: ${res.statusCode}`);
    console.log(`🌐 Access your BitPesa Bridge at: http://localhost:3000`);
    console.log(`👨‍💼 Admin dashboard: http://localhost:3000/admin`);
    
    if (res.statusCode === 200) {
      console.log('\n🎉 SUCCESS! Your BitPesa Bridge is ready!');
      console.log('\n📱 Available pages:');
      console.log('  - Landing Page: http://localhost:3000');
      console.log('  - Send Money: http://localhost:3000/send-money');
      console.log('  - Buy Airtime: http://localhost:3000/buy-airtime');
      console.log('  - Pay Bill: http://localhost:3000/paybill');
      console.log('  - Buy Goods: http://localhost:3000/buy-goods');
      console.log('  - Scan QR: http://localhost:3000/scan-qr');
      console.log('  - Admin: http://localhost:3000/admin');
    }
  });

  req.on('error', (err) => {
    console.log('❌ Web app is not running yet. Please wait...');
    console.log('💡 Make sure to run: pnpm dev (in apps/web directory)');
  });

  req.end();
}

// Test every 2 seconds until the app is running
const interval = setInterval(() => {
  testWebApp();
}, 2000);

// Stop testing after 30 seconds
setTimeout(() => {
  clearInterval(interval);
  console.log('\n⏰ Test timeout. If the app is not running, check the console for errors.');
}, 30000);
