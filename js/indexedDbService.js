const DB_NAME = 'FieldOpsDb';
const DB_VERSION = 2;

const STORE_SCHEMAS = [
    { name: 'voters', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'ward', keyPath: 'ward' }, { name: 'constituency', keyPath: 'constituency' }] },
    { name: 'contacts', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'voterId', keyPath: 'voterId' }, { name: 'agentId', keyPath: 'agentId' }] },
    { name: 'election_results', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'agentId', keyPath: 'agentId' }, { name: 'pollingStationId', keyPath: 'pollingStationId' }] },
    { name: 'candidate_votes', keyPath: 'id', indexes: [{ name: 'resultId', keyPath: 'resultId' }] },
    { name: 'campaigns', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'status', keyPath: 'status' }, { name: 'ward', keyPath: 'ward' }, { name: 'constituency', keyPath: 'constituency' }] },
    { name: 'campaign_assignments', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'campaignId', keyPath: 'campaignId' }, { name: 'volunteerId', keyPath: 'volunteerId' }, { name: 'status', keyPath: 'status' }] },
    { name: 'campaign_responses', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'campaignId', keyPath: 'campaignId' }, { name: 'assignmentId', keyPath: 'assignmentId' }, { name: 'voterId', keyPath: 'voterId' }, { name: 'agentId', keyPath: 'agentId' }] },
    { name: 'follow_up_tasks', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'campaignId', keyPath: 'campaignId' }, { name: 'voterId', keyPath: 'voterId' }, { name: 'assignedToAgentId', keyPath: 'assignedToAgentId' }, { name: 'status', keyPath: 'status' }] },
    { name: 'sync_queue', keyPath: 'id', indexes: [{ name: 'storeName', keyPath: 'storeName' }, { name: 'createdAt', keyPath: 'createdAt' }] },
    { name: 'photos', keyPath: 'id', indexes: [{ name: 'syncStatus', keyPath: 'syncStatus' }, { name: 'resultId', keyPath: 'resultId' }] },
    { name: 'metadata', keyPath: 'key' },
    { name: 'parties', keyPath: 'partyId' },
    { name: 'polling_stations', keyPath: 'stationId' }
];

let dbInstance = null;

function openDb() {
    return new Promise((resolve, reject) => {
        if (dbInstance) { resolve(dbInstance); return; }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            STORE_SCHEMAS.forEach(schema => {
                if (!db.objectStoreNames.contains(schema.name)) {
                    const store = db.createObjectStore(schema.name, { keyPath: schema.keyPath });
                    if (schema.indexes) {
                        schema.indexes.forEach(idx => {
                            if (!store.indexNames.contains(idx.name)) {
                                store.createIndex(idx.name, idx.keyPath, { unique: false });
                            }
                        });
                    }
                }
            });
        };
        request.onsuccess = () => { dbInstance = request.result; resolve(dbInstance); };
        request.onerror = () => reject(request.error);
    });
}

export async function initializeDb() {
    await openDb();
    return true;
}

export async function getById(storeName, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function getAll(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function put(storeName, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

export async function remove(storeName, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

export async function getByIndex(storeName, indexName, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function getBySyncStatus(storeName, status) {
    return getByIndex(storeName, 'syncStatus', status);
}

export async function getAllPendingSync() {
    const db = await openDb();
    const result = {};
    const stores = ['voters', 'contacts', 'election_results', 'photos', 'campaigns', 'campaign_assignments', 'campaign_responses', 'follow_up_tasks'];
    for (const store of stores) {
        const items = await getBySyncStatus(store, 'PendingCreate');
        const updates = await getBySyncStatus(store, 'PendingUpdate');
        const deletes = await getBySyncStatus(store, 'PendingDelete');
        result[store] = { pendingCreate: items, pendingUpdate: updates, pendingDelete: deletes };
    }
    return result;
}

export async function countBySyncStatus(storeName, status) {
    const items = await getBySyncStatus(storeName, status);
    return items.length;
}

export async function getMetadata(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readonly');
        const store = tx.objectStore('metadata');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
}

export async function setMetadata(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        store.put({ key, value });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearStore(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function bulkPut(storeName, items) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let count = 0;
        items.forEach(item => {
            const req = store.put(item);
            req.onsuccess = () => { count++; if (count === items.length) tx.commit(); };
        });
        tx.oncomplete = () => resolve(count);
        tx.onerror = () => reject(tx.error);
    });
}

export async function getStoreCounts() {
    const db = await openDb();
    const stores = ['voters', 'contacts', 'election_results', 'photos', 'campaigns', 'campaign_assignments', 'campaign_responses', 'follow_up_tasks', 'sync_queue'];
    const counts = {};
    for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) { counts[name] = 0; continue; }
        counts[name] = await new Promise((resolve, reject) => {
            const tx = db.transaction(name, 'readonly');
            const store = tx.objectStore(name);
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    return counts;
}

export async function enqueueSync(storeName, recordId, operation, payloadJson) {
    const item = {
        id: crypto.randomUUID(),
        storeName,
        recordId,
        operation,
        payloadJson,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        lastAttemptAt: null,
        lastError: null
    };
    await put('sync_queue', item);
    return item.id;
}

export async function dequeueSyncBatch(batchSize = 50) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const index = store.index('createdAt');
        const request = index.getAll(null, batchSize);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function removeSyncQueueItem(id) {
    return remove('sync_queue', id);
}

export async function updateSyncQueueRetry(id, error) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const req = store.get(id);
        req.onsuccess = () => {
            const item = req.result;
            if (item) {
                item.retryCount = (item.retryCount || 0) + 1;
                item.lastAttemptAt = new Date().toISOString();
                item.lastError = error;
                store.put(item);
            }
        };
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}
