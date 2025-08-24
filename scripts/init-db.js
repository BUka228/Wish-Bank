// Скрипт для инициализации базы данных
// Запустите после деплоя: node scripts/init-db.js

const https = require('https');

const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function initDatabase() {
  try {
    console.log('Инициализация базы данных...');
    const result = await makeRequest(`${VERCEL_URL}/api/init`);
    console.log('✅ База данных инициализирована:', result.message);
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message);
    process.exit(1);
  }
}

initDatabase();