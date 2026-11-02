function registerStudioRoutes(app, { store, aiClient, environment = process.env.NODE_ENV || 'development' }) {
  function ownerId(req) {
    const value = String(req.headers['x-nextaja-owner-id'] || '').trim();
    if (environment === 'test') return value || 'test-owner';
    if (environment !== 'production') return value || 'local-owner';
    return '';
  }
  function ownedWorkspace(req, id) {
    const owner = ownerId(req);
    if (!owner) return null;
    return store.getWorkspacesForOwner(owner).find(w => String(w.id) === String(id)) || null;
  }
  function requireOwner(req, res, next) {
    if (!ownerId(req)) return res.status(401).json({ error: 'Login pelanggan belum tersedia.' });
    next();
  }
  app.get('/ms/studio/health', (req, res) => res.json({ ok: true, service: 'studio', auth: environment === 'production' ? 'required' : 'development' }));
  app.get('/ms/studio/workspaces', requireOwner, (req, res) => {
    res.json({ workspaces: store.getWorkspacesForOwner(ownerId(req)).map(({ id, owner_id, name, quota, used, created_at }) => ({ id, ownerId: owner_id, name, quota, used, createdAt: created_at })) });
  });
  app.post('/ms/studio/workspaces', requireOwner, (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const quota = Math.min(Math.max(Number(req.body?.quota || 100), 1), 10000);
    if (!name) return res.status(400).json({ error: 'Nama workspace wajib diisi.' });
    const workspace = store.createWorkspace({ ownerId: ownerId(req), name, quota });
    res.status(201).json({ workspace });
  });
  app.get('/ms/studio/workspaces/:id', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    res.json({ workspace, brand: store.getBrand(workspace.id), usage: store.getUsage(workspace.id) });
  });
  app.put('/ms/studio/workspaces/:id/brand', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    const input = req.body || {};
    const brand = store.saveBrand(workspace.id, {
      businessName: String(input.businessName || '').slice(0, 120), category: String(input.category || '').slice(0, 80),
      audience: String(input.audience || '').slice(0, 500), voice: String(input.voice || '').slice(0, 300),
      goals: String(input.goals || '').slice(0, 500), restrictions: String(input.restrictions || '').slice(0, 500)
    });
    res.json({ brand });
  });
  app.get('/ms/studio/workspaces/:id/usage', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    res.json({ usage: store.getUsage(workspace.id) });
  });
  app.post('/ms/studio/workspaces/:id/packages', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    const topic = String(req.body?.topic || '').trim().slice(0, 160);
    if (!topic || !req.body?.payload || typeof req.body.payload !== 'object') return res.status(400).json({ error: 'Topic dan payload wajib diisi.' });
    const record = store.saveContentPackage(workspace.id, { topic, platform: String(req.body.platform || '').slice(0, 40), payload: req.body.payload });
    res.status(201).json({ package: record });
  });
  app.get('/ms/studio/workspaces/:id/packages', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    const status = String(req.query.status || '').trim();
    if (status && !['draft', 'review', 'approved', 'scheduled'].includes(status)) return res.status(400).json({ error: 'Status filter tidak valid.' });
    res.json({ packages: store.getPackages(workspace.id, status) });
  });
  app.patch('/ms/studio/packages/:packageId/status', requireOwner, (req, res) => {
    const record = store.getPackage(req.params.packageId);
    const workspace = record && ownedWorkspace(req, record.workspaceId);
    if (!record || !workspace) return res.status(404).json({ error: 'Package tidak ditemukan.' });
    const status = String(req.body?.status || '').trim();
    if (!['draft', 'review', 'approved', 'scheduled'].includes(status)) return res.status(400).json({ error: 'Status workflow tidak valid.' });
    res.json({ package: store.updatePackageStatus(record.id, status) });
  });
  app.get('/ms/studio/workspaces/:id/packages', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    res.json({ packages: store.getPackages(workspace.id) });
  });
  app.get('/ms/studio/packages/:packageId', requireOwner, (req, res) => {
    const record = store.getPackage(req.params.packageId);
    const workspace = record && ownedWorkspace(req, record.workspaceId);
    if (!record || !workspace) return res.status(404).json({ error: 'Package tidak ditemukan.' });
    res.json({ package: record, versions: store.getVersions(record.id) });
  });
  app.post('/ms/studio/packages/:packageId/versions', requireOwner, (req, res) => {
    const record = store.getPackage(req.params.packageId);
    const workspace = record && ownedWorkspace(req, record.workspaceId);
    if (!record || !workspace) return res.status(404).json({ error: 'Package tidak ditemukan.' });
    if (!req.body?.payload || typeof req.body.payload !== 'object') return res.status(400).json({ error: 'Payload wajib diisi.' });
    res.status(201).json({ version: store.saveVersion(record.id, req.body.payload, String(req.body.note || '').slice(0, 200)) });
  });
  app.post('/ms/studio/packages/:packageId/schedule', requireOwner, (req, res) => {
    const record = store.getPackage(req.params.packageId);
    const workspace = record && ownedWorkspace(req, record.workspaceId);
    if (!record || !workspace) return res.status(404).json({ error: 'Package tidak ditemukan.' });
    const scheduledAt = String(req.body?.scheduledAt || '').trim();
    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) return res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
    const item = store.saveCalendarItem(workspace.id, { title: record.topic, platform: String(req.body.platform || record.platform || '').slice(0, 40), scheduledAt, status: 'draft', packageId: record.id });
    const updated = store.updatePackageStatus(record.id, 'scheduled');
    res.status(201).json({ item, package: updated });
  });
  app.get('/ms/studio/packages/:packageId/export', requireOwner, (req, res) => {
    const record = store.getPackage(req.params.packageId);
    const workspace = record && ownedWorkspace(req, record.workspaceId);
    if (!record || !workspace) return res.status(404).json({ error: 'Package tidak ditemukan.' });
    const text = Object.entries(record.payload || {}).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`).join('\\n');
    res.json({ export: { packageId: record.id, topic: record.topic, platform: record.platform, status: record.status, text } });
  });
  app.get('/ms/studio/packages/:packageId/versions', requireOwner, (req, res) => {
    const record = store.getPackage(req.params.packageId);
    const workspace = record && ownedWorkspace(req, record.workspaceId);
    if (!record || !workspace) return res.status(404).json({ error: 'Package tidak ditemukan.' });
    res.json({ versions: store.getVersions(record.id) });
  });
  app.post('/ms/studio/workspaces/:id/calendar', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    const title = String(req.body?.title || '').trim().slice(0, 160);
    const scheduledAt = String(req.body?.scheduledAt || '').trim();
    if (!title || !scheduledAt || Number.isNaN(Date.parse(scheduledAt))) return res.status(400).json({ error: 'Judul dan tanggal jadwal yang valid wajib diisi.' });
    const status = ['draft', 'ready', 'published', 'cancelled'].includes(req.body?.status) ? req.body.status : 'draft';
    const item = store.saveCalendarItem(workspace.id, { title, platform: String(req.body.platform || '').slice(0, 40), scheduledAt, status, packageId: req.body.packageId || null });
    res.status(201).json({ item });
  });
  app.get('/ms/studio/workspaces/:id/calendar', requireOwner, (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    res.json({ items: store.getCalendarItems(workspace.id) });
  });
  app.post('/ms/studio/workspaces/:id/ideas', requireOwner, async (req, res) => {
    const workspace = ownedWorkspace(req, req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace tidak ditemukan.' });
    const topic = String(req.body?.topic || '').trim().slice(0, 160);
    const platform = String(req.body?.platform || '').trim().slice(0, 40);
    if (!topic) return res.status(400).json({ error: 'Topik wajib diisi.' });
    if (!aiClient || typeof aiClient.completeJson !== 'function') return res.status(503).json({ error: 'AI provider belum dikonfigurasi.' });
    if (!store.consumeQuota(workspace.id, 'generate_ideas')) return res.status(429).json({ error: 'Kuota workspace sudah habis.' });
    try {
      const brand = store.getBrand(workspace.id) || {};
      const result = await aiClient.completeJson({ prompt: JSON.stringify({ task: 'generate_content_ideas', topic, platform, brand }) });
      if (!result || !Array.isArray(result.ideas)) throw new Error('AI provider returned invalid ideas schema');
      const packageRecord = store.saveContentPackage(workspace.id, { topic, platform, payload: result });
      return res.status(201).json({ package: { id: packageRecord.id, topic: packageRecord.topic, platform: packageRecord.platform, ...packageRecord.payload, createdAt: packageRecord.createdAt } });
    } catch (error) {
      return res.status(502).json({ error: error.message || 'AI provider gagal dipanggil.' });
    }
  });
}
module.exports = { registerStudioRoutes };
