class Cache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value, ttl) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  del(key) {
    this.cache.delete(key);
  }
}

module.exports = new Cache();
