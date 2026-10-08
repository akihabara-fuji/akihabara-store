// Dipakai PM2 biar web tetap jalan walau VPS restart.
module.exports = { apps: [{ name: "akihabara-store", script: "server.js", cwd: __dirname + "/..", max_memory_restart: "300M" }] };
