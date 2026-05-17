/* Manifest version: TxB8CIcL */
self.importScripts('./service-worker-assets.js');
self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));
self.addEventListener('sync', event => {
    if (event.tag === 'fieldops-sync') {
        event.waitUntil(onSync());
    }
});

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [ /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/, /\.webmanifest$/ ];
const offlineAssetsExclude = [ /^service-worker\.js$/ ];

const baseUrl = new URL(self.registration.scope);
const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);

async function onInstall(event) {
    console.info('[FieldOps] Service worker: Install');
    const assetsRequests = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        .map(asset => new Request(new URL(asset.url, baseUrl).href, { integrity: asset.hash, cache: 'no-cache' }));
    await caches.open(cacheName).then(cache => cache.addAll(assetsRequests));
}

async function onActivate(event) {
    console.info('[FieldOps] Service worker: Activate');
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));

    // Register periodic sync if available
    if ('periodicSync' in self.registration) {
        try {
            await self.registration.periodicSync.register('fieldops-periodic-sync', {
                minInterval: 15 * 60 * 1000 // 15 minutes
            });
        } catch (e) {
            console.info('[FieldOps] Periodic sync not supported');
        }
    }
}

async function onFetch(event) {
    if (event.request.method !== 'GET') {
        return fetch(event.request);
    }

    const cache = await caches.open(cacheName);
    const shouldServeIndexHtml = event.request.mode === 'navigate'
        && !manifestUrlList.some(url => url === event.request.url);

    if (shouldServeIndexHtml) {
        const indexResponse = await cache.match(new URL('index.html', baseUrl).href)
            || await cache.match('index.html');

        if (indexResponse) {
            return indexResponse;
        }
    }

    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        return await fetch(event.request);
    } catch (error) {
        if (event.request.mode === 'navigate') {
            const indexResponse = await cache.match(new URL('index.html', baseUrl).href)
                || await cache.match('index.html');

            if (indexResponse) {
                return indexResponse;
            }
        }

        return new Response('', {
            status: 504,
            statusText: 'Gateway Timeout'
        });
    }
}

async function onSync() {
    console.info('[FieldOps] Background sync triggered');
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'FIELD_OPS_SYNC' });
    });
}
