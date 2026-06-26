let dotNetRef = null;

export function startMonitoring(dotNetRefParam) {
    dotNetRef = dotNetRefParam;

    window.addEventListener('online', () => {
        console.log('[Connectivity] Online');
        if (dotNetRef) {
            dotNetRef.invokeMethodAsync('OnOnline');
        }
    });

    window.addEventListener('offline', () => {
        console.log('[Connectivity] Offline');
        if (dotNetRef) {
            dotNetRef.invokeMethodAsync('OnOffline');
        }
    });

    // Initial state
    const isOnline = navigator.onLine;
    if (!isOnline && dotNetRef) {
        dotNetRef.invokeMethodAsync('OnOffline');
    }
}

export function stopMonitoring() {
    dotNetRef = null;
}
