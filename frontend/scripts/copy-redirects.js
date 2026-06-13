const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../public/_redirects');
const dest = path.join(__dirname, '../dist/bolao/browser/_redirects');

try {
  const content = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dest, content);
  console.log('✅ _redirects copiado com sucesso');
} catch (error) {
  console.error('❌ Erro ao copiar _redirects:', error.message);
  process.exit(1);
}