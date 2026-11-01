// Lê o arquivo .env (chaves e senhas) sem depender de biblioteca externa.
// Variáveis já definidas no ambiente têm prioridade sobre o arquivo.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function carregarEnv(arquivo = resolve(dirname(fileURLToPath(import.meta.url)), '../.env')) {
  if (!existsSync(arquivo)) return;
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || linha.trim().startsWith('#')) continue;
    const valor = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
}
