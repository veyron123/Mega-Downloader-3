const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

async function downloadAudio(url) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Недействительный URL YouTube.');
    }

    const tempWebmPath = path.join(__dirname, '..', `temp_audio_${Date.now()}.webm`);
    const tempMp3Path = path.join(__dirname, '..', `temp_audio_${Date.now()}.mp3`);

    try {
        console.log(`Начинаем загрузку аудио с ${url}...`);
        const audioStream = ytdl(url, { filter: 'audioonly' });
        
        await new Promise((resolve, reject) => {
            audioStream.pipe(fs.createWriteStream(tempWebmPath))
                .on('finish', resolve)
                .on('error', reject);
        });

        console.log(`Аудио успешно сохранено в ${tempWebmPath}`);
        console.log(`Начинаем конвертацию в MP3...`);

        await new Promise((resolve, reject) => {
            ffmpeg(tempWebmPath)
                .toFormat('mp3')
                .on('end', () => {
                    console.log(`Конвертация в MP3 завершена: ${tempMp3Path}`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Ошибка при конвертации:', err);
                    reject(err);
                })
                .save(tempMp3Path);
        });

        return tempMp3Path;

    } catch (error) {
        console.error('Ошибка при обработке аудио:', error.message);
        throw new Error('Не удалось обработать аудио с YouTube.');
    } finally {
        // Удаляем временный .webm файл
        if (fs.existsSync(tempWebmPath)) {
            fs.unlinkSync(tempWebmPath);
        }
    }
}

async function getAudioUrl(url) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Недействительный URL YouTube.');
    }
    try {
        console.log(`Получение информации о видео с ${url}...`);
        const info = await ytdl.getInfo(url);
        const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
        if (!audioFormat) {
            throw new Error('Не удалось найти подходящий аудиоформат.');
        }
        console.log('Прямой URL аудио получен:', audioFormat.url);
        return {
            audioUrl: audioFormat.url,
            videoTitle: info.videoDetails.title,
            channelId: info.videoDetails.channelId,
            videoId: info.videoDetails.videoId,
        };
    } catch (error) {
        console.error('Ошибка при получении URL аудио:', error.message);
        throw new Error('Не удалось получить прямой URL аудио с YouTube.');
    }
}

module.exports = {
    downloadAudio,
    getAudioUrl,
};