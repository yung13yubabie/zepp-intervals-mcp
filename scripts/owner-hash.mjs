import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function ownerHash(email) {
  if (typeof email !== 'string') throw new Error('請輸入自己的登入 email');
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    throw new Error('Email 格式不正確；未產生指紋');
  }
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

async function input() {
  const tty = process.stdin.isTTY;
  if (tty) {
    process.stderr.write('輸入你登入自己 Site 的 ChatGPT email（不回顯），按 Enter：');
    process.stdin.setRawMode(true);
  }
  process.stdin.setEncoding('utf8');
  let value = '';
  try {
    for await (const chunk of process.stdin) {
      for (const char of chunk) {
        if (char === '\u0003') throw new Error('已取消');
        if (char === '\r' || char === '\n') return value;
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
        if (value.length > 1024) throw new Error('輸入過長');
      }
    }
    return value;
  } finally {
    if (tty) { process.stdin.setRawMode(false); process.stderr.write('\n'); }
    process.stdin.pause();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(ownerHash(await input())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
