// Ponto de partida no Cloudflare Workers.
// Banco = D1; documentos = R2; telas = pasta public/ (servida pelo próprio Cloudflare);
// consulta aos tribunais = gatilho agendado (a cada 6 horas, ver wrangler.jsonc).

import { criarApp } from './app.js';
import { definirAmbiente } from './ambiente.js';
import { bancoD1, usarBanco, prepararBanco } from './banco.js';
import { arquivosR2, usarArquivos } from './arquivos.js';
import { garantirGestor } from './inicio.js';
import { semearDemo } from './demo-dados.js';
import { sincronizarTodos } from './datajud.js';

let app;
let d1Atual;
let iniciado;

function preparar(env) {
  definirAmbiente(env);
  if (env.DB !== d1Atual) {
    usarBanco(bancoD1(env.DB));
    usarArquivos(arquivosR2(env.ARQUIVOS));
    d1Atual = env.DB;
    iniciado = null;
  }
  app ??= criarApp({
    ipDe: (c) => c.req.header('CF-Connecting-IP') || '',
    cookieSeguro: (c) => new URL(c.req.url).protocol === 'https:',
  });
}

// Uma vez por inicialização: tabelas, gestor (dos segredos) e, na versão de teste, dados fictícios.
function primeiraVez(env) {
  iniciado ??= (async () => {
    await prepararBanco();
    await garantirGestor();
    if (env.DEMO === '1') await semearDemo();
  })().catch((e) => { iniciado = null; throw e; });
  return iniciado;
}

export default {
  async fetch(request, env, ctx) {
    preparar(env);
    const caminho = new URL(request.url).pathname;
    if (!caminho.startsWith('/api/')) return env.ASSETS.fetch(request);
    await primeiraVez(env);
    return app.fetch(request, env, ctx);
  },

  async scheduled(_evento, env, ctx) {
    preparar(env);
    await primeiraVez(env);
    ctx.waitUntil(sincronizarTodos().then((r) => console.log('[datajud]', JSON.stringify(r))));
  },
};
