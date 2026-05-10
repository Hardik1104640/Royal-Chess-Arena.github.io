// test-server.js - Test script to verify game listing API
// Run: node test-server.js

const http = require('http');

console.log('🧪 Testing Chess Game API...\n');

// Test the API endpoint
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/list-games',
  method: 'GET',
  headers: {
    'Cookie': 'sessionID=test'  // You'll need to get actual session cookie
  }
};

console.log(`📍 Testing: ${options.method} http://${options.hostname}:${options.port}${options.path}\n`);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);
    console.log('Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (Array.isArray(json)) {
        console.log(`\n✅ API returned ${json.length} games`);
        if (json.length > 0) {
          console.log('\n📊 Game Breakdown:');
          const botGames = json.filter(g => g.type === 'bot');
          const onlineGames = json.filter(g => g.type === 'online');
          console.log(`  🤖 Bot games: ${botGames.length}`);
          console.log(`  🌐 Online games: ${onlineGames.length}`);
          
          console.log('\n🎮 Sample game:');
          console.log(`  ID: ${json[0].id}`);
          console.log(`  Type: ${json[0].type}`);
          console.log(`  Opponent: ${json[0].opponent}`);
          console.log(`  Result: ${json[0].result}`);
          console.log(`  Date: ${json[0].date}`);
        }
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('\n💡 Make sure:');
  console.log('   1. Server is running on port 3000');
  console.log('   2. You are logged in (session exists)');
});

req.end();
