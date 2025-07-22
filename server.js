require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const ejs = require('ejs');

// Пути к сервисам теперь локальные для корневой папки
const { transcribeAudio: transcribeWithGroq } = require('./services/groq.service');
const { transcribeAudioFile: transcribeWithAssemblyAIFile, transcribeAudioUrl: transcribeWithAssemblyAIUrl } = require('./services/assemblyai.service.js');
const { downloadAudio, getAudioUrl } = require('./services/youtube.service');

const app = express();

// --- Настройки Express ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// --- Middleware для языка ---
const availableLanguages = ['ru', 'en', 'es', 'de'];
const defaultLanguage = 'ru';

app.use((req, res, next) => {
    const lang = req.path.split('/')[1];
    if (availableLanguages.includes(lang)) {
        req.lang = lang;
    } else {
        return next();
    }
    // Путь к locales теперь локальный для корневой папки
    const translationsPath = path.join(__dirname, 'locales', `${req.lang}.json`);
    fs.readFile(translationsPath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Could not load translations for ${req.lang}`, err);
            return res.status(500).send('Error loading language file.');
        }
        req.t = JSON.parse(data);
        next();
    });
});

// --- HTTP Маршруты ---
app.get('/', (req, res) => {
    res.redirect(`/${defaultLanguage}/`);
});

const services = ['youtube', 'facebook', 'instagram', 'twitter', 'tiktok'];

app.get('/sitemap.xml', (req, res) => {
    const baseUrl = 'https://mega-downloader.xyz';
    const urls = [];
    availableLanguages.forEach(lang => {
        urls.push({ loc: `${baseUrl}/${lang}/`, changefreq: 'daily', priority: '1.0' });
        services.forEach(service => {
            urls.push({ loc: `${baseUrl}/${lang}/${service}`, changefreq: 'weekly', priority: '0.8' });
        });
        urls.push({ loc: `${baseUrl}/${lang}/transcribe`, changefreq: 'weekly', priority: '0.8' });
        urls.push({ loc: `${baseUrl}/${lang}/terms`, changefreq: 'monthly', priority: '0.5' });
        urls.push({ loc: `${baseUrl}/${lang}/privacy`, changefreq: 'monthly', priority: '0.5' });
        urls.push({ loc: `${baseUrl}/${lang}/disclaimer`, changefreq: 'monthly', priority: '0.5' });
    });
    const sitemapParts = [];
    sitemapParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    sitemapParts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    urls.forEach(url => {
        sitemapParts.push('  <url>');
        sitemapParts.push(`    <loc>${url.loc}</loc>`);
        sitemapParts.push(`    <changefreq>${url.changefreq}</changefreq>`);
        sitemapParts.push(`    <priority>${url.priority}</priority>`);
        sitemapParts.push('  </url>');
    });
    sitemapParts.push('</urlset>');
    res.header('Content-Type', 'application/xml');
    res.send(sitemapParts.join('\n'));
});

app.get('/:lang/transcribe', (req, res) => {
     if (!availableLanguages.includes(req.params.lang)) {
        return res.status(404).send('Language not supported');
    }
    res.render('transcribe', { t: req.t, lang: req.lang, originalUrl: req.originalUrl });
});

app.get('/:lang/:service?', (req, res) => {
    const { lang, service = 'youtube' } = req.params;
    if (!availableLanguages.includes(lang) || !services.includes(service)) {
        return res.status(404).send('Page not found');
    }
    const serviceTitleKey = `title_${service}`;
    const serviceName = req.t.hero[serviceTitleKey] || `${service.charAt(0).toUpperCase() + service.slice(1)} Video Downloader`;
    res.render('downloader', {
        t: req.t,
        lang: lang,
        serviceName: serviceName,
        originalUrl: req.originalUrl
    });
});

app.post('/transcribe-file', async (req, res) => {
    const form = formidable({
        maxFileSize: 2 * 1024 * 1024 * 1024,
        maxTotalFileSize: 2 * 1024 * 1024 * 1024,
        keepExtensions: true,
    });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Ошибка при обработке формы:', err);
            return res.status(500).json({ error: 'Ошибка при загрузке файла.' });
        }
        const file = files.file?.[0] || files.file;
        if (!file) {
            return res.status(400).json({ error: 'Файл не загружен.' });
        }
        try {
            const transcription = await transcribeWithGroq(file.filepath);
            res.json({ transcription });
        } catch (error) {
            console.error('Ошибка транскрипции в Groq:', error);
            try {
                const transcription = await transcribeWithAssemblyAIFile(file.filepath);
                res.json({ transcription });
            } catch (assemblyError) {
                console.error('Ошибка транскрипции в AssemblyAI:', assemblyError);
                res.status(500).json({ error: assemblyError.message });
            }
        }
    });
});

app.post('/transcribe-url', async (req, res) => {
    const { url } = req.body;
    try {
        console.log('Попытка 1: Прямая транскрипция по URL через AssemblyAI...');
        const { audioUrl, videoTitle, channelId, videoId } = await getAudioUrl(url);
        const transcription = await transcribeWithAssemblyAIUrl(audioUrl);
        return res.json({
            transcription,
            videoTitle,
            channelId,
            videoId
        });
    } catch (fastError) {
        console.error('Прямая транскрипция по URL не удалась:', fastError.message);
        console.log('Переход к медленному способу (скачивание и загрузка файла).');
    }
    let tempFilePath = null;
    try {
        tempFilePath = await downloadAudio(url);
        try {
            console.log('Попытка 2: Транскрипция скачанного файла через Groq...');
            const transcription = await transcribeWithGroq(tempFilePath);
            return res.json({ transcription });
        } catch (groqError) {
            console.error('Ошибка транскрипции в Groq (URL):', groqError.message);
            console.log('Попытка 3: Транскрипция скачанного файла через AssemblyAI...');
            const transcription = await transcribeWithAssemblyAIFile(tempFilePath);
            return res.json({ transcription });
        }
    } catch (fallbackError) {
        console.error('Все способы транскрипции не удались:', fallbackError.message);
        return res.status(500).json({ error: fallbackError.message });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Временный файл ${tempFilePath} удален.`);
        }
    }
});

app.post('/download-video', async (req, res) => {
    const { url } = req.body;
    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Неверный или отсутствующий URL YouTube.' });
    }
    try {
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        const sanitizedTitle = info.videoDetails.title.replace(/[^\x00-\x7F]/g, "");
        res.header('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp4"`);
        
        console.log('Создание видеопотока...');
        const videoStream = ytdl(url, { format });
        console.log('Видеопоток создан.');

        videoStream.on('data', (chunk) => {
            res.write(chunk);
        });

        videoStream.on('end', () => {
            res.end();
        });

        videoStream.on('error', (err) => {
            console.error('Ошибка стрима ytdl:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Ошибка при обработке видеопотока.' });
            } else {
                res.end();
            }
        });

        res.on('error', (err) => {
            console.error('Ошибка ответа res:', err.message);
        });
    } catch (error) {
        console.error('Ошибка при скачивании видео:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Не удалось скачать видео.' });
        }
    }
});

app.get('/:lang/terms', (req, res) => {
    if (!req.t) return res.status(404).send("Language not supported");
    res.render('legal/terms', { t: req.t, lang: req.lang, originalUrl: req.originalUrl });
});

app.get('/:lang/privacy', (req, res) => {
    if (!req.t) return res.status(404).send("Language not supported");
    res.render('legal/privacy', { t: req.t, lang: req.lang, originalUrl: req.originalUrl });
});

app.get('/:lang/disclaimer', (req, res) => {
    if (!req.t) return res.status(404).send("Language not supported");
    res.render('legal/disclaimer', { t: req.t, lang: req.lang, originalUrl: req.originalUrl });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});