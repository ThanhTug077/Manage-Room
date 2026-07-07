// Store: polling + optimistic update + state helpers
// Phu thuoc DormAPI (js/api.js) - load sau api.js

const Store = {
  _pollers: new Map(),

  startPolling(resource, interval, callback) {
    this.stopPolling(resource);
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await DormAPI.list(resource, { force: true });
        if (callback) callback(data);
      } catch (e) { /* silent */ }
    }, interval || 30000);
    this._pollers.set(resource, id);
    return id;
  },

  stopPolling(resource) {
    const id = this._pollers.get(resource);
    if (id) { clearInterval(id); this._pollers.delete(resource); }
  },

  stopAllPolling() {
    for (const id of this._pollers.values()) clearInterval(id);
    this._pollers.clear();
  }
};