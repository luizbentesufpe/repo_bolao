const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'dist/bolao')));

// Redirecionar todas as rotas para index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/bolao', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend rodando em porta ${PORT}`);
});