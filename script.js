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
        dropZoneElement.querySelector(".drop-zone__prompt").remove();
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

const uploadBtn = document.getElementById('upload-btn');
const urlBtn = document.getElementById('url-btn');
const localResult = document.getElementById('local-result');
const urlResult = document.getElementById('url-result');
const fileInput = document.querySelector('.drop-zone__input');
const urlInput = document.getElementById('url-input');

uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) {
        localResult.textContent = 'Пожалуйста, выберите файл.';
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    localResult.textContent = 'Загрузка и транскрипция...';

    try {
        const response = await fetch('/transcribe-file', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            localResult.textContent = data.transcription;
        } else {
            localResult.textContent = `Ошибка: ${data.error}`;
        }
    } catch (error) {
        localResult.textContent = `Ошибка сети: ${error.message}`;
    }
});

urlBtn.addEventListener('click', async () => {
    const url = urlInput.value;
    if (!url) {
        urlResult.textContent = 'Пожалуйста, введите URL.';
        return;
    }

    urlResult.textContent = 'Загрузка и транскрипция...';

    try {
        const response = await fetch('/transcribe-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (response.ok) {
            urlResult.textContent = data.transcription;
        } else {
            urlResult.textContent = `Ошибка: ${data.error}`;
        }
    } catch (error) {
        urlResult.textContent = `Ошибка сети: ${error.message}`;
    }
});