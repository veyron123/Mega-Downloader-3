document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('urlForm');
    const input = document.getElementById('urlInput');
    const cardIframe = document.getElementById('cardApiIframe');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const languageSwitcherFooter = document.getElementById('languageSwitcher');
    const languageDropdownNavToggle = document.querySelector('#languageDropdownNav .dropdown-toggle');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.navbar-links');

    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            if (navLinks) {
                navLinks.classList.toggle('active');
            }
        });
    }
    
    const baseApiUrl = 'https://p.oceansaver.in/api/card2/?adUrl=https://myAdurl.com&url=';

    if (typeof iFrameResize === 'function') {
        iFrameResize({ log: false, checkOrigin: false }, '#cardApiIframe');
    }

    // Dropdown toggle functionality
    function setupDropdown(toggleElement) {
        if (toggleElement) {
            toggleElement.addEventListener('click', function(event) {
                event.preventDefault();
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content && content.classList.contains('dropdown-content')) {
                    const isActive = this.classList.contains('active');
                    document.querySelectorAll('.dropdown .dropdown-toggle.active').forEach(otherToggle => {
                        if (otherToggle !== this) {
                            otherToggle.classList.remove('active');
                            const otherContent = otherToggle.nextElementSibling;
                            if (otherContent) otherContent.style.display = 'none';
                        }
                    });
                    content.style.display = isActive ? 'block' : 'none';
                }
            });
        }
    }
    setupDropdown(languageDropdownNavToggle);

    // Close dropdowns if clicked outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown .dropdown-toggle.active').forEach(toggle => {
                toggle.classList.remove('active');
                const content = toggle.nextElementSibling;
                if (content) content.style.display = 'none';
            });
        }
    });

    // Theme toggle functionality
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    // Старый код для переключения языков удален, так как теперь это обрабатывается
    // стандартными ссылками, ведущими на разные URL.

    // Form submission for video download
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const targetUrl = input.value.trim();
            
            if (!targetUrl) {
                alert("Please enter a URL.");
                return;
            }

            try {
                new URL(targetUrl);
            } catch (_) {
                alert("Please enter a valid URL.");
                return;
            }

            console.log(`Updating iframe for URL: ${targetUrl}`);
            
            const encodedUrl = encodeURIComponent(targetUrl);
            if(cardIframe) {
                cardIframe.src = `${baseApiUrl}${encodedUrl}`;
            }
        });
    }
// --- Логика для страницы транскрипции ---
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) { // Запускаем этот код, только если мы на странице транскрипции
        document.querySelectorAll(".drop-zone__input").forEach((inputElement) => {
            const dropZoneElement = inputElement.closest(".drop-zone");

            dropZoneElement.addEventListener("click", (e) => {
                inputElement.click();
            });

            inputElement.addEventListener("change", (e) => {
                if (inputElement.files.length) {
                    updateThumbnail(dropZoneElement, inputElement.files[0]);
                }
            });

            dropZoneElement.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropZoneElement.classList.add("drop-zone--over");
            });

            ["dragleave", "dragend"].forEach((type) => {
                dropZoneElement.addEventListener(type, (e) => {
                    dropZoneElement.classList.remove("drop-zone--over");
                });
            });

            dropZoneElement.addEventListener("drop", (e) => {
                e.preventDefault();

                if (e.dataTransfer.files.length) {
                    inputElement.files = e.dataTransfer.files;
                    updateThumbnail(dropZoneElement, e.dataTransfer.files[0]);
                }

                dropZoneElement.classList.remove("drop-zone--over");
            });
        });

        function updateThumbnail(dropZoneElement, file) {
            let thumbnailElement = dropZoneElement.querySelector(".drop-zone__thumb");

            if (dropZoneElement.querySelector(".drop-zone__prompt")) {
                dropZoneElement.querySelector(".drop-zone__prompt").style.display = 'none';
            }

            if (!thumbnailElement) {
                thumbnailElement = document.createElement("div");
                thumbnailElement.classList.add("drop-zone__thumb");
                dropZoneElement.appendChild(thumbnailElement);
            }

            thumbnailElement.dataset.label = file.name;

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();

                reader.readAsDataURL(file);
                reader.onload = () => {
                    thumbnailElement.style.backgroundImage = `url('${reader.result}')`;
                };
            } else {
                thumbnailElement.style.backgroundImage = null;
            }
        }

        const urlBtn = document.getElementById('url-btn');
        const localResult = document.getElementById('local-result');
        const urlResult = document.getElementById('url-result');
        const localError = document.getElementById('local-error');
        const urlError = document.getElementById('url-error');
        const fileInput = document.querySelector('.drop-zone__input');
        const urlInput = document.getElementById('url-input');

        function clearState(resultEl, errorEl) {
            resultEl.textContent = '';
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }

        uploadBtn.addEventListener('click', async () => {
            if (!fileInput.files.length) {
                clearState(localResult, localError);
                localError.textContent = 'Пожалуйста, выберите файл.';
                localError.style.display = 'block';
                return;
            }

            clearState(localResult, localError);
            localResult.textContent = 'Загрузка и транскрипция...';
            uploadBtn.classList.add('loading');

            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/transcribe-file', {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                if (response.ok) {
                    localResult.textContent = data.transcription;
                } else {
                    localResult.textContent = '';
                    localError.textContent = `Ошибка: ${data.error}`;
                    localError.style.display = 'block';
                }
            } catch (error) {
                localResult.textContent = '';
                localError.textContent = `Ошибка сети: ${error.message}`;
                localError.style.display = 'block';
            } finally {
                uploadBtn.classList.remove('loading');
            }
        });

        urlBtn.addEventListener('click', async () => {
            const url = urlInput.value;
            if (!url) {
                clearState(urlResult, urlError);
                urlError.textContent = 'Пожалуйста, введите URL.';
                urlError.style.display = 'block';
                return;
            }

            clearState(urlResult, urlError);
            urlResult.textContent = 'Загрузка и транскрипция...';
            urlBtn.classList.add('loading');

            try {
                const response = await fetch('/transcribe-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });
                const data = await response.json();
                if (response.ok) {
                    urlResult.textContent = data.transcription;
                } else {
                    urlResult.textContent = '';
                    urlError.textContent = `Ошибка: ${data.error}`;
                    urlError.style.display = 'block';
                }
            } catch (error) {
                urlResult.textContent = '';
                urlError.textContent = `Ошибка сети: ${error.message}`;
                urlError.style.display = 'block';
            } finally {
                urlBtn.classList.remove('loading');
            }
        });

        // Логика для кнопок "Копировать"
        document.querySelectorAll('.btn-copy').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const targetElement = document.getElementById(targetId);
                if (targetElement && targetElement.textContent) {
                    navigator.clipboard.writeText(targetElement.textContent).then(() => {
                        const originalIcon = button.innerHTML;
                        button.innerHTML = '✅';
                        setTimeout(() => {
                            button.innerHTML = originalIcon;
                        }, 1500);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                }
            });
        });
    }
});