import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync } from 'node:fs';

// A small publication guard, not a substitute for manual review or secret scanning.
// Only staged/tracked files are intended for publication; untracked artifacts are excluded.
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (!paths.length) throw new Error('No tracked files to scan; stage the intended public files first.');
const problems = [];
const checks = [
  ['actual Site identifier', /appg(?:prj|ver|dep)_[a-f0-9]{16,}/i],
  ['personal deployed Site URL', /https?:\/\/[a-z0-9-]+\.[a-z0-9-]+\.chatgpt\.site/i],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['possible hardcoded owner hash', /OWNER_EMAIL_SHA256\s*[:=]\s*['"]?[a-f0-9]{64}/i],
  ['possible OpenAI key', /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
];
for (const name of paths) {
  if (/(^|\/)(?:node_modules|dist|\.git|\.wrangler|\.sites-runtime|\.private)(?:\/|$)/.test(name)
    || /(?:^|\/)(?:\.env(?!\.example$)|\.dev\.vars)/.test(name)
    || /\.(?:zip|tar|tgz|pem|key|tsbuildinfo)$/i.test(name)) problems.push(`${name}: generated/private file must not be published`);
  if (!lstatSync(name).isFile()) { problems.push(`${name}: expected a regular file`); continue; }
  const working = readFileSync(name, 'utf8');
  const staged = execFileSync('git', ['show', `:${name}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  for (const [scope, content] of [['working tree', working], ['index', staged]]) {
    for (const [label, pattern] of checks) if (pattern.test(content)) problems.push(`${name} (${scope}): ${label}`);
  }
}
for (const scope of ['working tree', 'index']) {
  const read = name => scope === 'index'
    ? execFileSync('git', ['show', `:${name}`], { encoding: 'utf8' }) : readFileSync(name, 'utf8');
  const hosting = JSON.parse(read('.openai/hosting.json'));
  if (hosting.project_id !== 'YOUR_NEW_SITE_PROJECT_ID') problems.push(`${scope}: public template must use the Site placeholder`);
  const lines = read('.env.example').split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  const defaults = { INTERVALS_API_KEY: '', OWNER_EMAIL_SHA256: '', INTERVALS_READ_ENABLED: 'false', INTERVALS_API_TERMS_ACCEPTED: 'false', WELLNESS_ZEPP_ONLY_CONFIRMED: 'false', WELLNESS_ZEPP_ONLY_FROM: '', WELLNESS_ZEPP_ONLY_THROUGH: '', WELLNESS_ATTESTED_AT: '' };
  if (lines.length !== Object.keys(defaults).length) problems.push(`${scope}: .env.example must contain exactly the documented assignments`);
  for (const [field, value] of Object.entries(defaults)) {
    if (lines.filter(line => line.startsWith(`${field}=`)).length !== 1 || !lines.includes(`${field}=${value}`)) {
      problems.push(`${scope}: .env.example requires one safe assignment for ${field}`);
    }
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log(`Public-template checks passed for ${paths.length} tracked files. Manual review is still required.`);
