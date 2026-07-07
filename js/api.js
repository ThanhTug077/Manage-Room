// Cau hinh goc cua MockAPI. Neu doi project MockAPI, chi can doi URL nay.
const API_BASE_URL = "https://69ead50515c7e2d5126a0f46.mockapi.io/v1";

// Anh xa ten resource trong code sang ten endpoint tren MockAPI.
const ENDPOINTS = {
  rooms: "rooms",
  students: "students",
  payments: "payments",
  admins: "admins",
  announcements: "announcements",
  complaints: "complaints"
};

// Ghep URL day du cho tung resource, co the kem id khi can thao tac mot ban ghi.
function buildUrl(resource, id = "") {
  const endpoint = ENDPOINTS[resource] || resource;
  const suffix = id ? `/${id}` : "";
  return `${API_BASE_URL}/${endpoint}${suffix}`;
}

// Ham dung chung cho moi request API: gui fetch, parse JSON va nem loi ro rang neu HTTP fail.
//Bất đồng bộ
async function requestJson(resource, options = {}) {
  const response = await fetch(buildUrl(resource, options.id), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.data ? JSON.stringify(options.data) : undefined
  });

  if (!response.ok) {
    let detail = response.statusText;
    //test lỗi
    try {
      const text = await response.text();
      detail = text || detail;
    } catch (error) {
      detail = response.statusText;
    }
    throw new Error(`API ${response.status}: ${detail}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ── Cache Layer: tranh goi MockAPI lien tuc, giam rate limit ──
const LS_PREFIX = "dm_cache_";

const Cache = {
  _store: new Map(),
  _pending: new Map(),
  _defaultTTL: 60000,
  _listTTL: 30000,

  _key(resource, id) {
    return id ? `${resource}:${id}` : `list:${resource}`;
  },

  _lsKey(key) { return LS_PREFIX + key; },

  _isExpired(entry) {
    return entry && entry.expires <= Date.now();
  },

  _loadFromLS(key) {
    try {
      const raw = localStorage.getItem(this._lsKey(key));
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (this._isExpired(entry)) {
        localStorage.removeItem(this._lsKey(key));
        return null;
      }
      return entry;
    } catch (e) {
      try { localStorage.removeItem(this._lsKey(key)); } catch (e2) { /* ignore */ }
      return null;
    }
  },

  _saveToLS(key, entry) {
    try {
      localStorage.setItem(this._lsKey(key), JSON.stringify(entry));
    } catch (e) { /* localStorage quota exceeded — bo qua */ }
  },

  _removeFromLS(key) {
    try { localStorage.removeItem(this._lsKey(key)); } catch (e) { /* ignore */ }
  },

  get(resource, id) {
    const key = this._key(resource, id);

    let entry = this._store.get(key);
    if (entry && this._isExpired(entry)) {
      this._store.delete(key);
      entry = null;
    }
    if (entry) return entry.data;

    entry = this._loadFromLS(key);
    if (entry) {
      this._store.set(key, entry);
      return entry.data;
    }

    return null;
  },

  set(resource, data, ttl, id) {
    const key = this._key(resource, id);
    const expires = Date.now() + (ttl || this._defaultTTL);
    const entry = { data, expires };
    this._store.set(key, entry);
    this._saveToLS(key, entry);
  },

  invalidate(resource) {
    const listKey = this._key(resource);
    const prefix = LS_PREFIX + resource + ":";

    this._store.delete(listKey);
    this._removeFromLS(listKey);

    for (const key of this._store.keys()) {
      if (key.startsWith(resource + ":")) {
        this._store.delete(key);
        this._removeFromLS(key);
      }
    }

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k === LS_PREFIX + listKey || k.startsWith(prefix)) {
        this._removeFromLS(k.slice(LS_PREFIX.length));
        i--;
      }
    }
  },

  invalidateAll() {
    this._store.clear();
    this._pending.clear();
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
  },

  dedup(resource, fetcher, id) {
    const key = this._key(resource, id);
    if (this._pending.has(key)) return this._pending.get(key);
    const promise = fetcher().finally(() => this._pending.delete(key));
    this._pending.set(key, promise);
    return promise;
  }
};

// ── Cached CRUD API: giong DormAPI cu nhung co cache tu dong ──
const DormAPI = {
  list(resource, options = {}) {
    const { ttl = Cache._listTTL, force = false } = options;
    if (!force) {
      const cached = Cache.get(resource);
      if (cached) return Promise.resolve(cached);
    }
    return Cache.dedup(resource, () =>
      requestJson(resource).then(data => {
        Cache.set(resource, data, ttl);
        return data;
      })
    );
  },

  get(resource, id, options = {}) {
    const { ttl = Cache._defaultTTL, force = false } = options;
    if (!force) {
      const cached = Cache.get(resource, id);
      if (cached) return Promise.resolve(cached);
    }
    return Cache.dedup(resource, () =>
      requestJson(resource, { id }).then(data => {
        Cache.set(resource, data, ttl, id);
        return data;
      }),
      id
    );
  },

  create(resource, data) {
    return requestJson(resource, { method: "POST", data }).then(result => {
      Cache.invalidate(resource);
      return result;
    });
  },

  update(resource, id, data) {
    return requestJson(resource, { method: "PUT", id, data }).then(result => {
      Cache.invalidate(resource);
      return result;
    });
  },

  remove(resource, id) {
    return requestJson(resource, { method: "DELETE", id }).then(result => {
      Cache.invalidate(resource);
      return result;
    });
  },

  // ── Cache control ──
  invalidateCache(resource) {
    Cache.invalidate(resource);
  },

  invalidateAllCache() {
    Cache.invalidateAll();
  }
};
