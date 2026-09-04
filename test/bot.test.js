'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getReply, evaluateMath } = require('../src/bot');

test('greets on hello', () => {
  assert.match(getReply('hello'), /Hello! I am Bot/);
  assert.match(getReply('Hi there'), /Hello! I am Bot/);
});

test('returns help text', () => {
  assert.match(getReply('help'), /Here is what I can do/);
});

test('echoes text after "echo "', () => {
  assert.equal(getReply('echo hello world'), 'hello world');
});

test('reports the time using injected clock', () => {
  const fixed = new Date('2020-01-02T03:04:05.000Z');
  const reply = getReply('what time is it?', { now: () => fixed });
  assert.equal(reply, 'The current server time is 2020-01-02T03:04:05.000Z.');
});

test('says goodbye', () => {
  assert.match(getReply('bye'), /Goodbye/);
});

test('handles empty input gracefully', () => {
  assert.match(getReply('   '), /didn't catch that/);
  assert.match(getReply(null), /didn't catch that/);
});

test('falls back for unknown input', () => {
  assert.match(getReply('banana'), /You said: "banana"/);
});

test('evaluateMath computes valid expressions', () => {
  assert.equal(evaluateMath('2 + 3 * 4'), 14);
  assert.equal(evaluateMath('(1 + 2) * 3'), 9);
});

test('evaluateMath rejects invalid or non-math input', () => {
  assert.equal(evaluateMath('hello'), null);
  assert.equal(evaluateMath('42'), null); // no operator -> not a math request
  assert.equal(evaluateMath('process.exit(1)'), null);
});

test('getReply solves math expressions', () => {
  assert.equal(getReply('2 + 3 * 4'), '2 + 3 * 4 = 14');
});
