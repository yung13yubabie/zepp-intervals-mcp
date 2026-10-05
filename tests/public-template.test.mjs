import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ownerHash } from '../scripts/owner-hash.mjs';
import { ownerAuthorized, dataTool } from '../lib/intervals.ts';

test('owner helper uses normalized email, without predefined personal identity', () => {
  assert.equal(ownerHash('  OWNER@EXAMPLE.INVALID  '), createHash('sha256').update('owner@example.invalid').digest('hex'));
  assert.throws(() => ownerHash(''));
  assert.throws(() => ownerHash('not an email'));
});

test('public manifest is a fresh Site placeholder and environment is disabled', () => {
  const manifest = JSON.parse(readFileSync(new URL('../.openai/hosting.json', import.meta.url), 'utf8'));
  assert.equal(manifest.project_id, 'YOUR_NEW_SITE_PROJECT_ID');
  assert.deepEqual(manifest.capabilities, ['mcp']);
  const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  for (const line of ['INTERVALS_API_KEY=', 'OWNER_EMAIL_SHA256=', 'INTERVALS_READ_ENABLED=false', 'INTERVALS_API_TERMS_ACCEPTED=false', 'WELLNESS_ZEPP_ONLY_CONFIRMED=false']) assert.ok(env.split('\n').includes(line));
});

test('fresh template cannot authorize or contact Intervals even with synthetic headers', async () => {
  const request = new Request('https://test.invalid', { headers: { 'oai-authenticated-user-id': 'test', 'oai-authenticated-user-email': 'owner@example.invalid' } });
  assert.equal(await ownerAuthorized(request, {}), false);
  let calls = 0;
  await assert.rejects(dataTool('list_workouts', { start_date: '2026-01-01', end_date: '2026-01-01' }, {}, async () => { calls++; throw new Error('must not fetch'); }), { code: 'read_disabled' });
  assert.equal(calls, 0);
});
