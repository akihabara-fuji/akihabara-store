const Database = require('better-sqlite3');

function createStore(filename = process.env.STUDIO_DB_PATH || 'data/studio.sqlite') {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quota INTEGER NOT NULL DEFAULT 100,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS brand_profiles (
      workspace_id INTEGER PRIMARY KEY,
      business_name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT '',
      voice TEXT NOT NULL DEFAULT '',
      goals TEXT NOT NULL DEFAULT '',
      restrictions TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS content_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT '',
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS content_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      payload TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(package_id, version_number),
      FOREIGN KEY (package_id) REFERENCES content_packages(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS calendar_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT '',
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      package_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (package_id) REFERENCES content_packages(id) ON DELETE SET NULL
    );

  `);
  const packageColumns = db.prepare('PRAGMA table_info(content_packages)').all().map(column => column.name);
  if (!packageColumns.includes('status')) db.exec("ALTER TABLE content_packages ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'");

  const createWorkspaceStmt = db.prepare('INSERT INTO workspaces (owner_id, name, quota) VALUES (?, ?, ?)');
  const getWorkspaceStmt = db.prepare('SELECT * FROM workspaces WHERE id = ?');
  const getOwnerStmt = db.prepare('SELECT * FROM workspaces WHERE owner_id = ? ORDER BY id');
  const saveBrandStmt = db.prepare(`INSERT INTO brand_profiles
    (workspace_id, business_name, category, audience, voice, goals, restrictions)
    VALUES (@workspaceId, @businessName, @category, @audience, @voice, @goals, @restrictions)
    ON CONFLICT(workspace_id) DO UPDATE SET
      business_name=excluded.business_name, category=excluded.category,
      audience=excluded.audience, voice=excluded.voice, goals=excluded.goals,
      restrictions=excluded.restrictions`);

  return {
    db,
    createWorkspace({ ownerId, name, quota = 100 }) {
      if (!ownerId || !name) throw new Error('ownerId and name are required');
      const info = createWorkspaceStmt.run(ownerId, name, quota);
      return getWorkspaceStmt.get(info.lastInsertRowid);
    },
    getWorkspacesForOwner(ownerId) { return getOwnerStmt.all(ownerId); },
    saveBrand(workspaceId, values = {}) {
      const workspace = getWorkspaceStmt.get(workspaceId);
      if (!workspace) throw new Error('workspace not found');
      saveBrandStmt.run({ workspaceId, businessName: values.businessName || '', category: values.category || '', audience: values.audience || '', voice: values.voice || '', goals: values.goals || '', restrictions: values.restrictions || '' });
      return this.getBrand(workspaceId);
    },
    getBrand(workspaceId) { return db.prepare('SELECT workspace_id AS workspaceId, business_name AS businessName, category, audience, voice, goals, restrictions FROM brand_profiles WHERE workspace_id = ?').get(workspaceId) || null; },
    consumeQuota(workspaceId, action) {
      const result = db.transaction(() => {
        const workspace = getWorkspaceStmt.get(workspaceId);
        if (!workspace || workspace.used >= workspace.quota) return false;
        db.prepare('UPDATE workspaces SET used = used + 1 WHERE id = ?').run(workspaceId);
        db.prepare('INSERT INTO usage_logs (workspace_id, action) VALUES (?, ?)').run(workspaceId, action || 'unknown');
        return true;
      })();
      return result;
    },
    getUsage(workspaceId) {
      const row = getWorkspaceStmt.get(workspaceId);
      if (!row) throw new Error('workspace not found');
      return { used: row.used, quota: row.quota, remaining: Math.max(0, row.quota - row.used) };
    },
    saveContentPackage(workspaceId, { topic, platform = '', payload }) {
      const workspace = getWorkspaceStmt.get(workspaceId);
      if (!workspace) throw new Error('workspace not found');
      const info = db.prepare('INSERT INTO content_packages (workspace_id, topic, platform, payload) VALUES (?, ?, ?, ?)').run(workspaceId, topic, platform, JSON.stringify(payload));
      const row = db.prepare('SELECT id, workspace_id AS workspaceId, topic, platform, payload, status, created_at AS createdAt FROM content_packages WHERE id = ?').get(info.lastInsertRowid);
      db.prepare('INSERT INTO content_versions (package_id, version_number, payload, note) VALUES (?, 1, ?, ?)').run(row.id, row.payload, 'Initial AI output');
      return { ...row, payload: JSON.parse(row.payload) };
    },
    getPackage(packageId) {
      const row = db.prepare('SELECT id, workspace_id AS workspaceId, topic, platform, payload, status, created_at AS createdAt FROM content_packages WHERE id = ?').get(packageId);
      return row ? { ...row, payload: JSON.parse(row.payload) } : null;
    },
    getPackages(workspaceId, status = '') {
      const rows = status
        ? db.prepare('SELECT id, workspace_id AS workspaceId, topic, platform, payload, status, created_at AS createdAt FROM content_packages WHERE workspace_id = ? AND status = ? ORDER BY id DESC').all(workspaceId, status)
        : db.prepare('SELECT id, workspace_id AS workspaceId, topic, platform, payload, status, created_at AS createdAt FROM content_packages WHERE workspace_id = ? ORDER BY id DESC').all(workspaceId);
      return rows.map(row => ({ ...row, payload: JSON.parse(row.payload) }));
    },
    updatePackageStatus(packageId, status) {
      db.prepare('UPDATE content_packages SET status = ? WHERE id = ?').run(status, packageId);
      return this.getPackage(packageId);
    },
    saveVersion(packageId, payload, note = '') {
      const next = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS number FROM content_versions WHERE package_id = ?').get(packageId).number;
      const info = db.prepare('INSERT INTO content_versions (package_id, version_number, payload, note) VALUES (?, ?, ?, ?)').run(packageId, next, JSON.stringify(payload), note);
      const row = db.prepare('SELECT id, package_id AS packageId, version_number AS versionNumber, payload, note, created_at AS createdAt FROM content_versions WHERE id = ?').get(info.lastInsertRowid);
      return { ...row, payload: JSON.parse(row.payload) };
    },
    getVersions(packageId) {
      return db.prepare('SELECT id, package_id AS packageId, version_number AS versionNumber, payload, note, created_at AS createdAt FROM content_versions WHERE package_id = ? ORDER BY version_number').all(packageId).map(row => ({ ...row, payload: JSON.parse(row.payload) }));
    },
    saveCalendarItem(workspaceId, values) {
      const info = db.prepare('INSERT INTO calendar_items (workspace_id, title, platform, scheduled_at, status, package_id) VALUES (?, ?, ?, ?, ?, ?)').run(workspaceId, values.title, values.platform || '', values.scheduledAt, values.status || 'draft', values.packageId || null);
      return this.getCalendarItem(info.lastInsertRowid);
    },
    getCalendarItem(id) {
      return db.prepare('SELECT id, workspace_id AS workspaceId, title, platform, scheduled_at AS scheduledAt, status, package_id AS packageId, created_at AS createdAt FROM calendar_items WHERE id = ?').get(id) || null;
    },
    getCalendarItems(workspaceId) {
      return db.prepare('SELECT id, workspace_id AS workspaceId, title, platform, scheduled_at AS scheduledAt, status, package_id AS packageId, created_at AS createdAt FROM calendar_items WHERE workspace_id = ? ORDER BY scheduled_at').all(workspaceId);
    },
    close() { db.close(); }
  };
}

module.exports = { createStore };
