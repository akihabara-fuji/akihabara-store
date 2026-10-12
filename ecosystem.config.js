module.exports = { apps: [{ name: "nextaja", script: "server.js", cwd: __dirname, max_memory_restart: "300M", env: { NODE_ENV: "production" } }] };
