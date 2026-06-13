const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');

// ✅ DEBUG: Lista arquivos
console.log('\n📁 Procurando em:', distPath);
try {
  const files = fs.readdirSync(distPath);
  console.log('📄 Arquivos encontrados:', files.slice(0, 10));
} catch (err) {
  console.error('❌ Pasta não existe:', err.message);
  console.log('\n🔍 Procurando pasta dist...');
  const parentPath = path.join(__dirname, 'dist');
  try {
    const dirs = fs.readdirSync(parentPath);
    console.log('📂 Dentro de dist:', dirs);
  } catch (e) {
    console.error('❌ dist também não existe');
  }
}

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});