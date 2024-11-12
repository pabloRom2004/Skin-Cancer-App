let stream;
let facingMode = 'environment';
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js', {
        scope: '/Skin-Cancer-App/' // Replace with your repo name
    })
    .then(registration => console.log('ServiceWorker registered'))
    .catch(error => console.log('ServiceWorker registration failed:', error));
}

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install prompt if not in standalone mode
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        document.getElementById('installPrompt').classList.add('show');
    }
});

// Handle install button click
document.getElementById('installButton').addEventListener('click', async () => {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // We no longer need the prompt
        deferredPrompt = null;
        // Hide the install button
        hideInstallPrompt();
    }
});

// Hide install prompt
function hideInstallPrompt() {
    document.getElementById('installPrompt').classList.remove('show');
}

// Hide prompt when app is installed
window.addEventListener('appinstalled', () => {
    hideInstallPrompt();
});

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Camera handling
async function initCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false
        });

        const videoElement = document.getElementById('camera');
        videoElement.srcObject = stream;
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera. Please ensure camera permissions are granted.');
    }
}

// Switch camera
document.getElementById('switchCameraBtn').addEventListener('click', () => {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    initCamera();
});

// Capture image
document.getElementById('captureBtn').addEventListener('click', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('preview');

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg');

    // Save to localStorage
    const images = JSON.parse(localStorage.getItem('skinImages') || '[]');
    images.push({
        id: Date.now(),
        data: imageData,
        date: new Date().toISOString(),
        prediction: null
    });
    localStorage.setItem('skinImages', JSON.stringify(images));

    // Show preview
    preview.innerHTML = `<img src="${imageData}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">
                        <p style="color: green; margin-top: 10px;">Image captured and saved successfully!</p>`;

    updateClinicianView();
});

// Update clinician view
function updateClinicianView() {
    const imageList = document.getElementById('imageList');
    const images = JSON.parse(localStorage.getItem('skinImages') || '[]');

    if (images.length === 0) {
        imageList.innerHTML = '<p class="no-images">No images submitted yet</p>';
        return;
    }

    imageList.innerHTML = images.map(image => `
        <div class="image-card" data-id="${image.id}">
            <img src="${image.data}" alt="Skin image">
            <input type="range" min="0" max="100" value="${image.prediction || 0}"
                   class="prediction-input" onchange="updatePrediction(${image.id}, this.value)">
            <p>Risk: ${image.prediction || 0}%</p>
            <p>Date: ${new Date(image.date).toLocaleString()}</p>
        </div>
    `).join('');
}

// Update prediction
function updatePrediction(imageId, prediction) {
    const images = JSON.parse(localStorage.getItem('skinImages') || '[]');
    const imageIndex = images.findIndex(img => img.id === imageId);
    
    if (imageIndex !== -1) {
        images[imageIndex].prediction = prediction;
        localStorage.setItem('skinImages', JSON.stringify(images));
        updateClinicianView();
    }
}

// Initialize camera when page loads
initCamera();

// Update clinician view when tab is shown
document.querySelector('button[onclick="showTab(\'clinician\')"]')
    .addEventListener('click', updateClinicianView);