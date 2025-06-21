const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

async function downloadAudio(url) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Недействительный URL YouTube.');
    }

    const tempFileName = `temp_audio_${Date.now()}.webm`;
    const tempFilePath = path.join(__dirname, '..', tempFileName);

    try {
        console.log(`Начинаем загрузку аудио с ${url}...`);
        const audioStream = ytdl(url, { filter: 'audioonly' });
        await pipelineAsync(audioStream, fs.createWriteStream(tempFilePath));
        console.log(`Аудио успешно сохранено в ${tempFilePath}`);
        return tempFilePath;
    } catch (error) {
        console.error('Ошибка при загрузке аудио:', error.message);
        // Попытка удалить временный файл в случае ошибки
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        throw new Error('Не удалось загрузить аудио с YouTube.');
    }
}

module.exports = {
    downloadAudio,
};