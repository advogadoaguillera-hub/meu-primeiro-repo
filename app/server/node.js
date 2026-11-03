// Monta o aplicativo para rodar no Node: no computador, num servidor comum
// (Google Cloud, VPS) e nos testes. Banco = arquivo SQLite; documentos = pasta.

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { criarApp } from './app.js';
import { definirAmbiente, variavel } from './ambiente.js';
import { usarBanco, prepararBanco } from './banco.js';
import { bancoNode } from './banco-node.js';
import { usarArquivos } from './arquivos.js';
import { arquivosEmPasta } from './arquivos-node.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICO = resolve(raiz, 'public');

// Mesma política de segurança que o Cloudflare aplica pelo arquivo public/_headers.
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

export async function montarNode(env = process.env) {
  definirAmbiente(env);
  const caminhoBanco = variavel('DB_PATH', 'data/aguillera.db');
  if (caminhoBanco !== ':memory:') {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dirname(resolve(raiz, caminhoBanco)), { recursive: true });
  }
  usarBanco(await bancoNode(caminhoBanco === ':memory:' ? caminhoBanco : resolve(raiz, caminhoBanco)));
  await prepararBanco();
  usarArquivos(await arquivosEmPasta(resolve(raiz, variavel('UPLOADS_DIR', 'data/arquivos'))));

  // Só confie no IP repassado se houver proxy de verdade na frente (Caddy, Render…);
  // sem proxy, um X-Forwarded-For falso burlaria o limite de tentativas de login.
  const confiarProxy = Boolean(variavel('TRUST_PROXY'));
  const api = criarApp({
    ipDe: (c) => (confiarProxy && c.req.header('X-Forwarded-For')?.split(',')[0].trim()) || c.env?.incoming?.socket?.remoteAddress || '',
    cookieSeguro: () => variavel('NODE_ENV') === 'production',
  });

  const app = new Hono();
  app.use('*', async (c, next) => {
    await next();
    if (!c.req.path.startsWith('/api/')) {
      c.header('Content-Security-Policy', CSP);
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('X-Frame-Options', 'DENY');
      c.header('Referrer-Policy', 'same-origin');
    }
  });
  app.route('/', api);
  app.use('/*', serveStatic({ root: relative(process.cwd(), PUBLICO) || '.' }));
  // Qualquer outro endereço abre o aplicativo (as telas usam #/rota).
  app.get('*', async (c) => c.html(await readFile(resolve(PUBLICO, 'index.html'), 'utf8')));
  return app;
}

export function iniciarServidor(app, porta) {
  return serve({ fetch: app.fetch, port: porta });
}
