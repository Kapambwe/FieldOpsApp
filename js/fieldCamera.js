export async function capturePhoto(maxWidth = 1024, quality = 0.7) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });

        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, maxWidth);
        canvas.height = video.videoHeight * (canvas.width / video.videoWidth);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        stream.getTracks().forEach(track => track.stop());

        const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        return base64;
    } catch (err) {
        console.error('[FieldOps] Camera error:', err);
        throw err;
    }
}

export function isCameraAvailable() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
