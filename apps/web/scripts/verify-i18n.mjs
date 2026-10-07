import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/i18n/messages');
const STRING = String.raw`(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")`;
const TRIPLE = new RegExp(String.raw`(\w+|'[^']+'):\s*\[\s*(${STRING})\s*,\s*(${STRING})\s*,\s*(${STRING})\s*,?\s*\]`, 'g');

const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
const unquote = (value) => value.slice(1, -1);

let triples = 0;
const problems = [];

for (const file of readdirSync(root).filter((name) => name.endsWith('.ts') && name !== 'index.ts')) {
  const source = readFileSync(path.join(root, file), 'utf8');

  for (const match of source.matchAll(TRIPLE)) {
    triples += 1;
    const [, key, en, rw, fr] = match;
    const [enText, rwText, frText] = [en, rw, fr].map(unquote);

    for (const [lang, text] of [['rw', rwText], ['fr', frText]]) {
      if (!text.trim()) problems.push(`${file} ${key}: empty ${lang}`);
      if (placeholders(text) !== placeholders(enText)) {
        problems.push(`${file} ${key}: ${lang} placeholders {${placeholders(text)}} differ from en {${placeholders(enText)}}`);
      }
    }
  }
}

for (const problem of problems) console.log(`FAIL  ${problem}`);
console.log(`\n${triples} strings checked in 3 languages, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
