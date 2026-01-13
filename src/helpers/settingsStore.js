const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class SettingsStore {
  constructor(options = {}) {
    const { filename = "settings.json" } = options;
    this.filePath = path.join(app.getPath("userData"), filename);
    this.cache = null;
  }

  load() {
    if (this.cache) {
      return this.cache;
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      this.cache = JSON.parse(raw);
    } catch (error) {
      this.cache = {};
    }

    return this.cache;
  }

  save(settings) {
    this.cache = settings;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), "utf8");
  }

  get(key, fallback) {
    const settings = this.load();
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      return settings[key];
    }
    return fallback;
  }

  set(key, value) {
    const settings = this.load();
    settings[key] = value;
    this.save(settings);
    return value;
  }
}

module.exports = SettingsStore;
