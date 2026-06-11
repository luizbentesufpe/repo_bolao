const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist', 'bolao');

// Debug
console.log(`Servindo arquivos de: ${distPath}`);
console.log(`Arquivos existem: ${require('fs').existsSync(distPath)}`);

// Servir arquivos estáticos
app.use(express.static(distPath));

// Redirecionar todas as rotas para index.html (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log(`GET ${req.path} -> ${indexPath}`);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Frontend rodando em porta ${PORT}`);
});