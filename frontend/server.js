const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORRETO para Render com Root Directory = frontend
const distPath = path.join(__dirname, 'dist', 'bolao', 'browser');

console.log(`📁 Servindo de: ${distPath}`);

// ✅ Servir arquivos estáticos
app.use(express.static(distPath));

// ✅ Para qualquer rota não encontrada, servir index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log(`📄 Buscando: ${indexPath}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Erro ao servir index.html:', err);
      res.status(404).send('index.html não encontrado');
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📁 Servindo arquivos de: ${distPath}`);
});