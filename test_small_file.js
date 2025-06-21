const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testSmallFileTranscription() {
    try {
        console.log('🧪 Тестируем транскрипцию малого файла...');
        
        const fileName = 'test_audio.mp3';
        
        if (!fs.existsSync(fileName)) {
            console.error('❌ Файл не найден:', fileName);
            return;
        }
        
        console.log('✅ Файл найден, размер:', fs.statSync(fileName).size, 'байт');
        
        const form = new FormData();
        form.append('file', fs.createReadStream(fileName));
        
        console.log('📤 Отправляем запрос на сервер...');
        
        const response = await axios.post('http://localhost:3000/transcribe-file', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 60000, // 1 минута
        });
        
        console.log('✅ Ответ получен!');
        console.log('📝 Транскрипция:', response.data.transcription);
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error.message);
        if (error.response) {
            console.error('❌ Статус:', error.response.status);
            console.error('❌ Ответ сервера:', error.response.data);
        }
    }
}

testSmallFileTranscription();