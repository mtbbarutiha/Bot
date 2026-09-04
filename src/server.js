'use strict';

const path = require('path');
const express = require('express');
const { getReply } = require('./bot');

/**
 * Build the Express application. Exported separately from the server bootstrap
 * so tests can import the app without binding to a port.
 *
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.post('/api/chat', (req, res) => {
    const message = req.body && req.body.message;
    if (typeof message !== 'string') {
      res.status(400).json({ error: 'Request body must include a string "message" field.' });
      return;
    }
    const reply = getReply(message);
    res.json({ reply });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`Bot server listening on http://${host}:${port}`);
  });
}

module.exports = { createApp };
