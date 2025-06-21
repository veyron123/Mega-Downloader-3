const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function transcribeAudio(filePath) {
    try {
        console.log(`Отправка файла ${filePath} в Groq API...`);
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-large-v3',
            response_format: 'json',
            language: 'ru',
            temperature: 0.0,
        });
        console.log('Транскрипция успешно получена.');
        return transcription.text;
    } catch (error) {
        console.error('Ошибка в Groq API:', error.message);
        if (error.response) {
            console.error('Ответ Groq API:', error.response.data);
        }
        throw new Error('Не удалось транскрибировать аудио.');
    }
}

module.exports = {
    transcribeAudio,
};