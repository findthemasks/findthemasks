export default class LocalStorageUtils {
  constructor() {
    try {
      window.localStorage.setItem('testKey', 'test');
      window.localStorage.removeItem('testKey');
      this.localStorageAvailable = true;
    } catch (e) {
      this.localStorageAvailable = false;
    }
  }

  setItem(key, data) {
    if (this.localStorageAvailable) {
      if (typeof data === 'string') {
        window.localStorage.setItem(key, data);
      } else {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    }
  }

  getItem(key) {
    if (this.localStorageAvailable) {
      const value = window.localStorage.getItem(key);
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      return value;
    }
    return null;
  }
}

let instance;

export const getInstance = () => {
  if (!instance) {
    instance = new LocalStorageUtils();
  }
  return instance;
};
