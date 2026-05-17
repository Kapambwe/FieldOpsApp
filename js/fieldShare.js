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
