document.addEventListener('DOMContentLoaded', () => {
    // --- ОБЩИЕ ЭЛЕМЕНТЫ ---
    // ... (общая логика)

    // --- ЛОГИКА СТРАНИЦЫ ТРАНСКРИПЦИИ ---
    const transcribePageContainer = document.getElementById('transcribe-page-container');
    if (transcribePageContainer) {
        // --- Elements for upload/URL forms ---
        const uploadBtn = document.getElementById('upload-btn');
        const urlBtn = document.getElementById('url-btn');
        const fileInput = document.querySelector('.drop-zone__input');
        const urlInput = document.getElementById('url-input');

        // --- Elements for the NEW transcript viewer ---
        const newTranscriptContainer = document.querySelector('.transcript-container');
        const initialView = document.getElementById('transcribe-initial-view');
        if (initialView) initialView.style.display = 'block';
        
        if (newTranscriptContainer) {
            const transcriptBodyEl = newTranscriptContainer.querySelector('.transcript-content');
            const copyBtn = newTranscriptContainer.querySelector('.copy-button');
            const searchInput = newTranscriptContainer.querySelector('.search-bar input');
            
            const updateTranscriptContent = (htmlContent) => {
                if (initialView) initialView.style.display = 'none';
                if (newTranscriptContainer) newTranscriptContainer.style.display = 'block';
                if (transcriptBodyEl) {
                    transcriptBodyEl.innerHTML = htmlContent;
                    const p = transcriptBodyEl.querySelector('p');
                    if (p) {
                        // Save original text for searching
                        p.dataset.originalText = p.textContent;
                    }
                }
            };

            async function handleUrlTranscription(url) {
                updateTranscriptContent('<p>Получение транскрипции...</p>');
                if(urlBtn) urlBtn.classList.add('loading');

                try {
                    const response = await fetch('/transcribe-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    });
                    const data = await response.json();
                    updateTranscriptContent(`<p>${response.ok ? data.transcription : `Ошибка: ${data.error}`}</p>`);
                } catch (error) {
                    updateTranscriptContent(`<p>Сетевая ошибка: ${error.message}</p>`);
                } finally {
                    if(urlBtn) urlBtn.classList.remove('loading');
                }
            }

            async function handleFileUpload() {
                if (!fileInput.files || fileInput.files.length === 0) {
                    alert('Пожалуйста, выберите файл.');
                    return;
                }
                updateTranscriptContent('<p>Загрузка и транскрипция файла...</p>');
                if(uploadBtn) uploadBtn.classList.add('loading');

                const formData = new FormData();
                formData.append('file', fileInput.files[0]);

                try {
                    const response = await fetch('/transcribe-file', {
                        method: 'POST',
                        body: formData,
                    });
                    const data = await response.json();
                    updateTranscriptContent(`<p>${response.ok ? data.transcription : `Ошибка: ${data.error}`}</p>`);
                } catch (error) {
                    updateTranscriptContent(`<p>Сетевая ошибка: ${error.message}</p>`);
                } finally {
                    if(uploadBtn) uploadBtn.classList.remove('loading');
                }
            }

            if (urlBtn) {
                urlBtn.addEventListener('click', () => {
                    const url = urlInput.value.trim();
                    if (url) {
                        handleUrlTranscription(url);
                    } else {
                        alert('Пожалуйста, введите URL.');
                    }
                });
            }

            if (uploadBtn) {
                uploadBtn.addEventListener('click', handleFileUpload);
            }

            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    if (transcriptBodyEl) {
                        navigator.clipboard.writeText(transcriptBodyEl.textContent).then(() => {
                            copyBtn.textContent = 'Скопировано!';
                            setTimeout(() => { copyBtn.textContent = 'Copy Transcript'; }, 2000);
                        });
                    }
                });
            }

            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const searchText = searchInput.value;
                    const p = transcriptBodyEl ? transcriptBodyEl.querySelector('p') : null;
                    if (p) {
                        const originalText = p.dataset.originalText || p.textContent;
                        
                        if (searchText) {
                            const regex = new RegExp(`(${searchText})`, 'gi');
                            p.innerHTML = originalText.replace(regex, '<mark>$1</mark>');
                        } else {
                            p.innerHTML = originalText;
                        }
                    }
                });
            }
        }
    }

    // --- ЛОГИКА СТРАНИЦЫ ЗАГРУЗЧИКА ---
    const downloadButton = document.getElementById('download-button');
    const qualitySelector = document.querySelector('.quality-selector');
    const qualityDropdown = document.getElementById('quality-dropdown');
    const selectedQualitySpan = document.getElementById('selected-quality');
    const downloadStatus = document.getElementById('download-status');


    if (qualitySelector) {
        qualitySelector.addEventListener('click', (event) => {
            event.stopPropagation();
            qualityDropdown.classList.toggle('hidden');
            qualitySelector.classList.toggle('open');
        });
    }

    if (qualityDropdown) {
        qualityDropdown.addEventListener('click', (event) => {
            if (event.target.tagName === 'LI') {
                const quality = event.target.dataset.quality;
                const qualityText = event.target.textContent;
                selectedQualitySpan.textContent = qualityText;
                selectedQualitySpan.dataset.quality = quality;
                qualityDropdown.classList.add('hidden');
                qualitySelector.classList.remove('open');
            }
        });
    }

    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            const videoUrl = document.getElementById('video-url-input').value.trim();
            if (videoUrl) {
                const iframeContainer = document.getElementById('iframe-container');
                iframeContainer.innerHTML = ''; // Clear previous iframe
                const iframe = document.createElement('iframe');
                iframe.id = 'cardApiIframe';
                iframe.scrolling = 'no';
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.allowTransparency = 'true';
                iframe.style.border = 'none';
                iframe.style.minHeight = '360px';
                iframe.src = `https://p.oceansaver.in/api/card2/?url=${encodeURIComponent(videoUrl)}&adUrl=https://myAdurl.com`;
                iframeContainer.appendChild(iframe);
                iFrameResize({ log: false }, '#cardApiIframe');
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (qualityDropdown && !qualityDropdown.classList.contains('hidden')) {
            if (!qualitySelector.contains(event.target)) {
                qualityDropdown.classList.add('hidden');
                qualitySelector.classList.remove('open');
            }
        }
    });
});