const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testLocalFileTranscription() {
    try {
        console.log('🧪 Начинаем тест транскрипции локального файла...');
        
        const fileName = 'AI 2026： Ошеломляющий прогноз Илона Маска об ИИ в 2026 году..mp4';
        
        // Проверяем существование файла
        if (!fs.existsSync(fileName)) {
            console.error('❌ Файл не найден:', fileName);
            return;
        }
        
        console.log('✅ Файл найден, размер:', fs.statSync(fileName).size, 'байт');
        
        // Создаем form data
        const form = new FormData();
        form.append('file', fs.createReadStream(fileName));
        
        console.log('📤 Отправляем запрос на сервер...');
        
        // Отправляем запрос
        const response = await axios.post('http://localhost:3000/transcribe-file', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 300000, // 5 минут
        });
        
        console.log('✅ Ответ получен!');
        console.log('📝 Транскрипция:', response.data.transcription);
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error.message);
        if (error.response) {
            console.error('❌ Ответ сервера:', error.response.data);
        }
    }
}

testLocalFileTranscription();