import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const mode = process.argv.includes('--format') ? 'format' : 'lint';
const roots = ['src','ui','scripts','tests'];
const extensions = new Set(['.ts','.js','.mjs','.json','.html','.css','.md']);
const files = [];
for (const root of roots) walk(root);

function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) walk(full);
    else if (name.isFile() && extensions.has(extname(name.name))) files.push(full);
  }
}

const problems = [];
for (const file of files.sort()) {
  const rel = relative(process.cwd(), file).replaceAll('\\','/');
  const bytes = readFileSync(file);
  const text = bytes.toString('utf8');
  if (text.includes('\u0000')) problems.push(`${rel}: NUL byte`);
  if (/^(<<<<<<<|=======|>>>>>>>)(?: .*)?$/m.test(text)) problems.push(`${rel}: unresolved merge conflict marker`);
  if (/[\u202A-\u202E\u2066-\u2069]/u.test(text)) problems.push(`${rel}: bidirectional control character`);
  if (mode === 'format') {
    if (text.includes('\r\n')) problems.push(`${rel}: CRLF line endings`);
    if (text && !text.endsWith('\n')) problems.push(`${rel}: missing final newline`);
    const lines = text.split('\n');
    for (let i=0;i<lines.length;i++) {
      if (/[ \t]+$/.test(lines[i])) { problems.push(`${rel}:${i+1}: trailing whitespace`); break; }
      if (/\t/.test(lines[i])) { problems.push(`${rel}:${i+1}: tab indentation`); break; }
    }
  }
}

if (problems.length) {
  console.error(`${mode.toUpperCase()} CHECK FAILED (${problems.length})`);
  for (const p of problems.slice(0,100)) console.error(`- ${p}`);
  if (problems.length > 100) console.error(`- ... ${problems.length-100} more`);
  process.exit(1);
}
console.log(`${mode.toUpperCase()} CHECK PASS: ${files.length} files`);
