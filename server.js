require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const ejs = require('ejs');

const { transcribeAudio } = require('./services/groq.service');
const { downloadAudio } = require('./services/youtube.service');

const app = express();
const port = process.env.PORT || 3000;

// --- Настройки шаблонизатора ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// --- Middleware для определения языка ---
const availableLanguages = ['ru', 'en', 'es', 'de'];
const defaultLanguage = 'ru';

app.use((req, res, next) => {
    const lang = req.path.split('/')[1];
    
    if (availableLanguages.includes(lang)) {
        req.lang = lang;
    } else {
        return next();
    }

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


// --- Маршруты страниц ---

// Редирект с корня на язык по умолчанию
app.get('/', (req, res) => {
    res.redirect(`/${defaultLanguage}/`);
});

// Маршрут для страницы транскрипции
app.get('/:lang/transcribe', (req, res) => {
     if (!availableLanguages.includes(req.params.lang)) {
        return res.status(404).send('Language not supported');
    }
    res.render('transcribe', { t: req.t, lang: req.lang });
});

// Универсальный маршрут для страниц загрузчиков
const services = ['youtube', 'facebook', 'instagram', 'twitter', 'tiktok'];
app.get('/:lang/:service?', (req, res) => {
    const { lang, service = 'youtube' } = req.params; // По умолчанию 'youtube'
    if (!availableLanguages.includes(lang) || !services.includes(service)) {
        return res.status(404).send('Page not found');
    }
    const serviceTitleKey = `title_${service}`;
    const serviceName = req.t.hero[serviceTitleKey] || `${service.charAt(0).toUpperCase() + service.slice(1)} Video Downloader`;
    
    res.render('downloader', {
        t: req.t,
        lang: lang,
        serviceName: serviceName
    });
});


// --- API эндпоинты (остаются без изменений) ---

app.post('/transcribe-file', async (req, res) => {
    const form = formidable({
        maxFileSize: 200 * 1024 * 1024,
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
            const transcription = await transcribeAudio(file.filepath);
            res.json({ transcription });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

app.post('/transcribe-url', async (req, res) => {
    const { url } = req.body;
    let tempFilePath = null;
    try {
        tempFilePath = await downloadAudio(url);
        const transcription = await transcribeAudio(tempFilePath);
        res.json({ transcription });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
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
        ytdl(url, { format }).pipe(res);
    } catch (error) {
        console.error('Ошибка при скачивании видео:', error.message);
        res.status(500).json({ error: 'Не удалось скачать видео.' });
    }
});

// --- Запуск сервера ---
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});