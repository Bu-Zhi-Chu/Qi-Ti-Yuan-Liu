PhotoPool.prototype.constructor = function(){
    this.dbName = 'imageCacheDB'
    this.storeName  = 'images'
    const dbPromise = indexedDB.open(this.dbName, 1);
    dbPromise.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName,  { keyPath: 'id' });
        }
    };
}

PhotoPool.prototype.getImageData = function (id, url,callback) {
    const dbPromise  = indexedDB.open(this.dbName, 1);
    dbPromise.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(id);
        request.onsuccess = (event) => {
            const blob = event.target.result;
            if (blob) {
                callback(blob.imageData)
            } else {
                this.downloadImage(id, url, callback)
            }
        };
    };
}

PhotoPool.prototype.downloadImage = function  (id, url, callback) {
    axios.get(url, { responseType: 'blob' })
        .then(response => {
            const blob = new Blob([response.data], { type: 'image/jpeg' });
            callback(blob)
            const dbPromise = indexedDB.open(this.dbName);
            dbPromise.onsuccess = (event) => {
                const db = event.target.result;
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.put({ id: id, imageData: blob });
            };
        })
        .catch(error => {
            console.error('请求图片失败:', error);
        });
}