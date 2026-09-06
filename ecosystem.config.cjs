/** PM2 process file — production PetDate */
module.exports = {
  apps: [
    {
      name: 'petdate-api',
      cwd: __dirname,
      script: 'packages/api/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      max_memory_restart: '512M',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NODE_OPTIONS: '--dns-result-order=ipv4first',
      },
    },
    {
      name: 'petdate-bot',
      cwd: __dirname,
      script: 'packages/bot/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      max_memory_restart: '512M',
      kill_timeout: 8000,
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--dns-result-order=ipv4first',
      },
    },
  ],
};
