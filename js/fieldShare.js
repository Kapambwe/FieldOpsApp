export async function shareOrDownloadText(filename, title, text) {
    try {
        if (navigator.share) {
            await navigator.share({
                title,
                text
            });
            return;
        }
    } catch (err) {
        console.warn('[FieldOps] Share failed, falling back to download:', err);
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'election-result.txt';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

export function setLargeTextMode(enabled) {
    document.documentElement.classList.toggle('fieldops-large-text', !!enabled);
}

export function setTallyMode(enabled) {
    document.documentElement.classList.toggle('fieldops-tally-mode', !!enabled);
}

export function setDocumentLanguage(languageCode) {
    const code = typeof languageCode === 'string' && languageCode.trim() ? languageCode.trim() : 'en';
    document.documentElement.lang = code;
}

export function speakText(text, languageCode) {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
        return false;
    }

    const message = typeof text === 'string' ? text.trim() : '';
    if (!message) {
        return false;
    }

    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(message);
    const code = typeof languageCode === 'string' && languageCode.trim() ? languageCode.trim() : 'en';
    utterance.lang = code === 'fr'
        ? 'fr-FR'
        : code === 'bem'
            ? 'bem'
            : code === 'toi'
                ? 'toi'
                : code === 'ny'
                    ? 'ny'
                    : 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    return true;
}

export function stopSpeaking() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}
