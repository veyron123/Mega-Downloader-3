const express = require('express');
const app = express();
const port = 3001;

console.log('Запуск простого тестового сервера...');

app.use(express.json());

app.get('/', (req, res) => {
    console.log('GET / запрос получен');
    res.send('Сервер работает!');
});

app.post('/test', (req, res) => {
    console.log('POST /test запрос получен');
    res.json({ message: 'POST работает!' });
});

app.listen(port, () => {
    console.log(`✅ Простой сервер запущен на http://localhost:${port}`);
});