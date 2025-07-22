const { AssemblyAI } = require('assemblyai');
const fs = require('fs');

const assemblyaiApiKey = "05fe563ebf764949b6b2539336b49330";

if (!assemblyaiApiKey) {
    console.error('AssemblyAI API key is not configured. Please set ASSEMBLYAI_API_KEY environment variable');
}

const client = new AssemblyAI({
    apiKey: assemblyaiApiKey,
});

async function transcribeAudioFile(filePath) {
    if (!assemblyaiApiKey) {
        throw new Error('AssemblyAI API key is not configured.');
    }

    try {
        console.log(`Загрузка файла ${filePath} на серверы AssemblyAI...`);
        
        const uploadUrl = await client.files.upload(filePath);
        console.log('Файл успешно загружен, URL:', uploadUrl);

        const config = {
            audio_url: uploadUrl,
            speaker_labels: true,
        };
        
        console.log('Отправка запроса на транскрипцию в AssemblyAI API...');
        const transcript = await client.transcripts.create(config);
        
        if (transcript.status === 'error') {
            throw new Error(`Ошибка транскрипции: ${transcript.error}`);
        }
        
        console.log('Транскрипция успешно получена от AssemblyAI API.');
        return transcript.text;

    } catch (error) {
        console.error('Ошибка в AssemblyAI API:', error);
        throw new Error(`Не удалось транскрибировать аудиофайл с помощью AssemblyAI: ${error.message}`);
    }
}

async function transcribeAudioUrl(audioUrl) {
    if (!assemblyaiApiKey) {
        throw new Error('AssemblyAI API key is not configured.');
    }

    try {
        console.log(`Отправка URL ${audioUrl} в AssemblyAI API...`);
        
        const config = {
            audio_url: audioUrl,
            speaker_labels: true,
        };
        
        const transcript = await client.transcripts.create(config);
        
        if (transcript.status === 'error') {
            throw new Error(`Ошибка транскрипции: ${transcript.error}`);
        }
        
        console.log('Транскрипция успешно получена от AssemblyAI API.');
        return transcript.text;

    } catch (error) {
        console.error('Ошибка в AssemblyAI API:', error);
        throw new Error(`Не удалось транскрибировать аудио по URL с помощью AssemblyAI: ${error.message}`);
    }
}

const WebSocket = require('ws');

async function transcribeRealtime(clientWs) {
    if (!assemblyaiApiKey) {
        throw new Error('AssemblyAI API key is not configured.');
    }

    console.log('Инициализация real-time транскрипции с AssemblyAI...');
    
    const aaiWs = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000`,
        { headers: { Authorization: assemblyaiApiKey } }
    );

    aaiWs.on('open', () => {
        console.log('WebSocket соединение с AssemblyAI установлено.');
        clientWs.send(JSON.stringify({ status: 'connected', message: 'Готов к приему аудио' }));
    });

    aaiWs.on('message', (message) => {
        const data = JSON.parse(message);
        // Пересылаем сообщение от AssemblyAI напрямую нашему клиенту
        clientWs.send(JSON.stringify(data));
    });

    aaiWs.on('error', (error) => {
        console.error('Ошибка WebSocket соединения с AssemblyAI:', error);
        clientWs.send(JSON.stringify({ status: 'error', message: 'Ошибка соединения с AssemblyAI' }));
    });

    aaiWs.on('close', (code, reason) => {
        console.log(`WebSocket соединение с AssemblyAI закрыто: ${code} ${reason}`);
        clientWs.send(JSON.stringify({ status: 'closed', message: 'Соединение с AssemblyAI закрыто' }));
    });

    return aaiWs;
}


module.exports = {
    transcribeAudioFile,
    transcribeAudioUrl,
    transcribeRealtime,
};