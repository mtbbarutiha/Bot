'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/server');

/**
 * Start the app on an ephemeral port and return its base URL plus a close fn.
 */
function startServer() {
  return new Promise((resolve) => {
    const server = createApp().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

test('GET /api/health returns ok', async () => {
  const srv = await startServer();
  try {
    const res = await fetch(`${srv.baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  } finally {
    await srv.close();
  }
});

test('POST /api/chat returns a bot reply', async () => {
  const srv = await startServer();
  try {
    const res = await fetch(`${srv.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.reply, /Hello! I am Bot/);
  } finally {
    await srv.close();
  }
});

test('POST /api/chat validates the message field', async () => {
  const srv = await startServer();
  try {
    const res = await fetch(`${srv.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notmessage: 1 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /message/);
  } finally {
    await srv.close();
  }
});

test('GET / serves the chat UI', async () => {
  const srv = await startServer();
  try {
    const res = await fetch(`${srv.baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<title>Bot — Chat<\/title>/);
  } finally {
    await srv.close();
  }
});
