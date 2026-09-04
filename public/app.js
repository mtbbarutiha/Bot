(function () {
  'use strict';

  const log = document.getElementById('log');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const status = document.getElementById('status');

  function addMessage(text, who) {
    const li = document.createElement('li');
    li.className = `msg msg--${who}`;
    li.textContent = text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
    return li;
  }

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('bad status');
      status.classList.add('is-ok');
      status.title = 'Server online';
    } catch {
      status.classList.add('is-err');
      status.title = 'Server offline';
    }
  }

  async function sendMessage(message) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }
    const data = await res.json();
    return data.reply;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';
    input.focus();
    sendBtn.disabled = true;

    try {
      const reply = await sendMessage(message);
      addMessage(reply, 'bot');
    } catch (err) {
      addMessage(`⚠️ ${err.message}`, 'bot');
    } finally {
      sendBtn.disabled = false;
    }
  });

  addMessage('Hi! I am Bot. Type "help" to see what I can do.', 'bot');
  checkHealth();
})();
