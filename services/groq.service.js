const Groq = require('groq-sdk');
const fs = require('fs');

// Получаем API ключ из переменных окружения
const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
    console.error('Groq API key is not configured. Please set GROQ_API_KEY environment variable');
}

const groq = groqApiKey ? new Groq({
    apiKey: groqApiKey,
}) : null;

async function transcribeAudio(filePath) {
    if (!groq) {
        throw new Error('Groq API key is not configured. Please set GROQ_API_KEY environment variable.');
    }
    
    // Вычисляем размер файла для логирования
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    console.log(`Размер файла: ${fileSizeMB.toFixed(1)}MB`);
    
    try {
        console.log(`Отправка файла ${filePath} в Groq API...`);
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-large-v3',
            response_format: 'json',
            language: 'en', // Изменено на английский для видео с Илоном Маском
            temperature: 0.0,
        });
        console.log('Транскрипция успешно получена от Groq API.');
        return transcription.text;
    } catch (error) {
        console.error('Ошибка в Groq API:', error.message);
        if (error.response) {
            console.error('Ответ Groq API:', error.response.data);
        }
        throw new Error(`Не удалось транскрибировать аудио: ${error.message}`);
    }
}

module.exports = {
    transcribeAudio,
};