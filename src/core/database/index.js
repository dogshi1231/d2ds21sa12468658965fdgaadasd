const fs = require('fs');
const path = require('path');

// Phase 1: file-backed adapter for compatibility. Switch to Prisma later.
class FileAdapter {
  constructor(baseDir = path.join(process.cwd(), 'data')) {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  }
  readJson(name, fallback = {}) {
    const file = path.join(this.baseDir, `${name}.json`);
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
  }
  writeJson(name, obj) {
    const file = path.join(this.baseDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
    return true;
  }
}

module.exports = new FileAdapter();