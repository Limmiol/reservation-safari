/**
 * Pure JavaScript JSON file database — no native modules, works on any machine.
 * Data is stored in server/data.json on your local disk.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

// Load or initialise
let _db = { users: [], entities: {} };
if (fs.existsSync(DB_PATH)) {
  try { _db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch {}
}

// Debounced async save — never blocks the event loop.
// Batches rapid consecutive writes into a single disk flush after 150 ms.
let _saveTimer = null;
const save = () => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const json = JSON.stringify(_db, null, 2);
    fs.writeFile(DB_PATH, json, (err) => {
      if (err) console.error('[DB] Save error:', err.message);
    });
  }, 150);
};

// ── Users ────────────────────────────────────────────────────────────────────
const users = {
  findByEmail: (email) => _db.users.find((u) => u.email === email) || null,
  findById: (id) => _db.users.find((u) => u.id === id) || null,
  create: (user) => { _db.users.push(user); save(); return user; },
  update: (id, patch) => {
    const idx = _db.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    _db.users[idx] = { ..._db.users[idx], ...patch };
    save();
    return _db.users[idx];
  },
  delete: (id) => { _db.users = _db.users.filter((u) => u.id !== id); save(); },
  all: () => _db.users,
};

// ── Generic Entities ─────────────────────────────────────────────────────────
const entity = {
  _get: (name) => {
    if (!_db.entities[name]) _db.entities[name] = [];
    return _db.entities[name];
  },

  list: (name, sort = '-created_date', limit = 500) => {
    const rows = [...entity._get(name)];
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    rows.sort((a, b) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
    return rows.slice(0, limit);
  },

  findById: (name, id) => entity._get(name).find((r) => r.id === id) || null,

  filter: (name, criteria, sort = '-created_date', limit = 500) => {
    let rows = entity._get(name).filter((row) =>
      Object.entries(criteria).every(([k, v]) => String(row[k]) === String(v))
    );
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    rows.sort((a, b) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
    return rows.slice(0, limit);
  },

  create: (name, record) => {
    entity._get(name).push(record);
    save();
    return record;
  },

  update: (name, id, patch) => {
    const arr = entity._get(name);
    const idx = arr.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...patch };
    save();
    return arr[idx];
  },

  delete: (name, id) => {
    _db.entities[name] = entity._get(name).filter((r) => r.id !== id);
    save();
  },
};

module.exports = { users, entity };
