module.exports = { apps: [{ name: "mahyra-serv", script: "server.js", cwd: __dirname, max_memory_restart: "300M", env: { NODE_ENV: "production" } }] };
