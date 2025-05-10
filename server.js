const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Servir arquivos estáticos do diretório atual
app.use(express.static(__dirname));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
}); 