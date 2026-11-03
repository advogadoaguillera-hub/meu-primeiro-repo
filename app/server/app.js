// A API do aplicativo (/api/...). Feita com Hono, que roda igual no Node
// (computador, servidor comum, testes) e no Cloudflare Workers.
// As telas (pasta public/) são servidas por quem monta o app: server/node.js
// ou o próprio Cloudflare.

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import escritorio from '../config/escritorio.js';
import * as n from './nucleo.js';
import * as auth from './auth.js';
import * as ia from './claude.js';
import * as datajud from './datajud.js';
import { ferramentas } from './ferramentas.js';
import { arquivos } from './arquivos.js';
import { variavel } from './ambiente.js';
import { prepararBanco } from './banco.js';

const TIPOS_ACEITOS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
};
const LIMITE_ARQUIVO = 15 * 1024 * 1024;

const id = (v) => {
  const x = Number(v);
  if (!Number.isInteger(x) || x <= 0) throw new n.ErroDeRegra('Identificador inválido.', 400);
  return x;
};

// Corpo JSON do pedido (vazio ou inválido vira {}).
async function corpo(c) {
  try { return (await c.req.json()) || {}; } catch { return {}; }
}

// Endereços do site que podem registrar visitas: o site do escritório (com e sem www)
// e, para testes, os de SITE_ORIGENS (separados por vírgula).
function origensPermitidas() {
  const lista = new Set();
  try {
    const u = new URL(escritorio.links.site);
    const semWww = u.hostname.replace(/^www\./, '');
    lista.add(`${u.protocol}//${semWww}`);
    lista.add(`${u.protocol}//www.${semWww}`);
  } catch { /* site ainda não configurado */ }
  for (const o of variavel('SITE_ORIGENS').split(',')) if (o.trim()) lista.add(o.trim().replace(/\/$/, ''));
  return lista;
}
const hostDoSite = () => { try { return new URL(escritorio.links.site).hostname.replace(/^www\./, ''); } catch { return ''; } };

// Arquivo enviado (formulário com campo "arquivo"): confere e guarda com nome sorteado.
async function receberArquivo(c) {
  const form = await c.req.parseBody();
  const arq = form.arquivo;
  if (!arq || typeof arq === 'string' || !arq.size) throw new n.ErroDeRegra('Escolha um arquivo.');
  if (arq.size > LIMITE_ARQUIVO) throw new n.ErroDeRegra('Arquivo maior que 15 MB.');
  const ext = TIPOS_ACEITOS[arq.type];
  if (!ext) throw new n.ErroDeRegra('Envie PDF, imagem (JPG/PNG/WEBP) ou Word.');
  const sorteio = [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const nome = sorteio + ext;
  await arquivos().salvar(nome, await arq.arrayBuffer(), arq.type);
  return { form, arquivo: nome, nome_original: String(arq.name || 'arquivo').slice(0, 200), mime: arq.type, tamanho: arq.size };
}

/**
 * @param {{ ipDe: (c) => string, cookieSeguro: (c) => boolean }} opcoes
 */
export function criarApp({ ipDe = () => '', cookieSeguro = () => true } = {}) {
  const app = new Hono();
  const api = new Hono();

  // Cabeçalhos de segurança em toda resposta da API.
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'same-origin');
    c.header('X-Frame-Options', 'DENY');
    c.header('Cache-Control', c.res.headers.get('Cache-Control') || 'no-store');
  });

  // Banco pronto (tabelas criadas) antes de qualquer pedido.
  app.use('/api/*', async (_c, next) => { await prepararBanco(); await next(); });

  // ---------------------------------------------------------- contador de visitas do site
  // Vem de outro endereço (aguillera.art.br), por isso fica antes da proteção CSRF;
  // só aceita o próprio site e não grava dado pessoal.
  const ritmo = new Map();
  app.options('/api/visita', (c) => {
    const o = c.req.header('Origin');
    if (origensPermitidas().has(o)) c.header('Access-Control-Allow-Origin', o);
    c.header('Access-Control-Allow-Methods', 'POST');
    c.header('Access-Control-Allow-Headers', 'Content-Type');
    return c.body(null, 204);
  });
  app.post('/api/visita', bodyLimit({ maxSize: 2048 }), async (c) => {
    const origem = c.req.header('Origin') || (() => { try { return new URL(c.req.header('Referer')).origin; } catch { return ''; } })();
    if (!origensPermitidas().has(origem)) return c.body(null, 403);
    c.header('Access-Control-Allow-Origin', origem);
    const chave = `${ipDe(c)}|${Math.floor(Date.now() / 60_000)}`;
    const qtd = (ritmo.get(chave) || 0) + 1;
    ritmo.set(chave, qtd);
    if (ritmo.size > 5000) ritmo.clear();
    if (qtd > 60) return c.body(null, 429);
    try {
      const d = JSON.parse((await c.req.text()) || '{}');
      await n.registrarVisita({ pagina: d.pagina, fonte: n.fonteDaVisita(d.referencia, hostDoSite()), nova: Boolean(d.nova) });
      return c.body(null, 204);
    } catch {
      return c.body(null, 400);
    }
  });

  // ---------------------------------------------------------- quem está pedindo
  api.use('*', async (c, next) => {
    const quem = await auth.identificar({ cookie: c.req.header('Cookie'), autorizacao: c.req.header('Authorization') });
    c.set('usuario', quem.usuario);
    c.set('token', quem.token);
    c.set('porChave', quem.porChave);
    // Proteção contra requisições forjadas (CSRF): escrita feita pelo navegador precisa
    // do cabeçalho X-Aguillera, que só o próprio aplicativo envia. Chave de acesso dispensa.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && !quem.porChave && c.req.header('X-Aguillera') !== '1') {
      throw new n.ErroDeRegra('Requisição recusada.', 403);
    }
    await next();
  });
  // Uploads aceitam até 20 MB; o resto, até 1 MB.
  api.use('*', async (c, next) => {
    const limite = c.req.path.endsWith('/documentos') && c.req.method === 'POST' ? 20 * 1024 * 1024 : 1024 * 1024;
    return bodyLimit({ maxSize: limite, onError: () => { throw new n.ErroDeRegra('Arquivo maior que 15 MB.', 413); } })(c, next);
  });

  const exigir = (teste, msg, status) => async (c, next) => {
    if (!teste(c.get('usuario'))) throw new n.ErroDeRegra(msg, status);
    await next();
  };
  const logado = exigir((u) => u, 'Entre na sua conta para continuar.', 401);
  const doEscritorio = exigir(auth.ehEscritorio, 'Acesso restrito ao escritório.', 403);
  const soGestor = exigir((u) => u?.papel === 'gestor', 'Apenas o gestor pode fazer isso.', 403);
  const soCliente = exigir((u) => u?.papel === 'cliente', 'Área do cliente.', 403);

  // ---------------------------------------------------------- público
  api.get('/marca', (c) => {
    const { pagamento, ...publico } = escritorio;
    return c.json({ ...publico, pagamento, recursos: { claude: ia.claudeConfigurado(), datajud: datajud.datajudConfigurado() } });
  });

  api.post('/cadastro', async (c) => {
    const b = await corpo(c);
    if (!b.consentimento) throw new n.ErroDeRegra('É preciso concordar com o tratamento dos dados (LGPD) para criar a conta.');
    await auth.criarUsuario({ ...b, papel: 'cliente' });
    const { token, usuario } = await auth.entrar(b.email, b.senha, ipDe(c));
    c.header('Set-Cookie', auth.textoCookie(token, cookieSeguro(c)));
    return c.json({ usuario }, 201);
  });

  api.post('/entrar', async (c) => {
    const b = await corpo(c);
    const { token, usuario } = await auth.entrar(b.email, b.senha, ipDe(c));
    c.header('Set-Cookie', auth.textoCookie(token, cookieSeguro(c)));
    return c.json({ usuario });
  });

  api.post('/sair', async (c) => {
    await auth.sair(c.get('token'));
    c.header('Set-Cookie', auth.textoCookie(null, cookieSeguro(c)));
    return c.json({ ok: true });
  });

  api.get('/eu', async (c) => c.json({ usuario: c.get('usuario') ? await n.buscarProprio(c.get('usuario').id) : null }));

  // ---------------------------------------------------------- conta (qualquer pessoa logada)
  api.patch('/eu', logado, async (c) => c.json({ usuario: await n.atualizarProprioPerfil(c.get('usuario'), await corpo(c)) }));
  api.post('/eu/senha', logado, async (c) => {
    const b = await corpo(c);
    await auth.trocarSenha(c.get('usuario').id, b.atual, b.nova, c.get('token'));
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------- área do cliente
  const cli = new Hono();
  cli.use('*', logado, soCliente);
  const eu = (c) => c.get('usuario').id;
  cli.get('/inicio', async (c) => c.json(await n.inicioDoCliente(eu(c))));
  cli.get('/processos', async (c) => c.json(await n.listarProcessos({ clienteId: eu(c), apenasVisivel: true })));
  cli.get('/processos/:id', async (c) => {
    const p = await n.buscarProcesso(id(c.req.param('id')), { apenasVisivel: true });
    if (p.cliente_id !== eu(c)) throw new n.ErroDeRegra('Processo não encontrado.', 404);
    return c.json(p);
  });
  cli.get('/mensagens', async (c) => {
    await n.marcarLidas(eu(c), false);
    return c.json(await n.listarConversa(eu(c)));
  });
  cli.post('/mensagens', async (c) => c.json(await n.enviarMensagem(eu(c), eu(c), (await corpo(c)).texto, false), 201));
  cli.get('/documentos', async (c) => c.json(await n.listarDocumentos(eu(c))));
  cli.post('/documentos', async (c) => {
    const r = await receberArquivo(c);
    const tipo = ['documento_pessoal', 'comprovante', 'outro'].includes(r.form.tipo) ? r.form.tipo : 'outro';
    try {
      return c.json(await n.criarDocumento({
        cliente_id: eu(c), tipo, titulo: String(r.form.titulo || '').slice(0, 200) || n.TIPOS_DOCUMENTO[tipo],
        arquivo: r.arquivo, nome_original: r.nome_original, mime: r.mime, tamanho: r.tamanho,
      }, eu(c)), 201);
    } catch (e) {
      await arquivos().apagar(r.arquivo);
      throw e;
    }
  });
  cli.get('/cobrancas', async (c) => c.json(await n.listarCobrancas({ clienteId: eu(c) })));
  cli.get('/solicitacoes', async (c) => c.json(await n.listarSolicitacoes({ clienteId: eu(c) })));
  cli.post('/solicitacoes', async (c) => c.json(await n.criarSolicitacao(eu(c), await corpo(c)), 201));
  api.route('/cliente', cli);

  // ---------------------------------------------------------- download (cliente dono ou escritório)
  api.get('/documentos/:id/arquivo', logado, async (c) => {
    const d = await n.buscarDocumento(id(c.req.param('id')));
    if (!auth.podeVerCliente(c.get('usuario'), d.cliente_id)) throw new n.ErroDeRegra('Documento não encontrado.', 404);
    const dados = await arquivos().ler(d.arquivo);
    if (!dados) throw new n.ErroDeRegra('Arquivo indisponível.', 404);
    const nome = d.nome_original.replace(/[^\w.\- À-ú]/g, '_');
    return c.body(dados, 200, {
      'Content-Type': d.mime,
      'Content-Disposition': `${c.req.query('ver') ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'Cache-Control': 'private, no-store',
    });
  });

  // ---------------------------------------------------------- escritório (gestor + equipe)
  const esc = new Hono();
  esc.use('*', logado, doEscritorio);
  const quem = (c) => c.get('usuario').id;

  esc.get('/painel', async (c) => c.json(await n.painel()));
  esc.get('/site', async (c) => c.json(await n.relatorioSite(c.req.query('dias'))));

  esc.get('/clientes', async (c) => c.json(await n.listarClientes({ busca: c.req.query('busca') || '', situacao: c.req.query('situacao') || 'todos' })));
  esc.post('/clientes', async (c) => c.json(await auth.criarUsuario({ ...(await corpo(c)), papel: 'cliente' }, quem(c)), 201));
  esc.get('/clientes/:id', async (c) => {
    const cid = id(c.req.param('id'));
    const [cliente, processos, cobrancas, documentos, solicitacoes] = await Promise.all([
      n.exigirCliente(cid), n.listarProcessos({ clienteId: cid }), n.listarCobrancas({ clienteId: cid }),
      n.listarDocumentos(cid), n.listarSolicitacoes({ clienteId: cid }),
    ]);
    return c.json({ cliente, processos, cobrancas, documentos, solicitacoes });
  });
  esc.patch('/clientes/:id', async (c) => c.json(await n.atualizarCliente(id(c.req.param('id')), await corpo(c), quem(c))));

  esc.get('/processos', async (c) => c.json(await n.listarProcessos({ busca: c.req.query('busca') || '', status: c.req.query('status') || undefined })));
  esc.post('/processos', async (c) => c.json(await n.criarProcesso(await corpo(c), quem(c)), 201));
  esc.get('/processos/:id', async (c) => c.json(await n.buscarProcesso(id(c.req.param('id')))));
  esc.patch('/processos/:id', async (c) => c.json(await n.atualizarProcesso(id(c.req.param('id')), await corpo(c), quem(c))));
  esc.post('/processos/:id/andamentos', async (c) => {
    const pid = id(c.req.param('id'));
    const { inserido } = await n.registrarAndamento(pid, { ...(await corpo(c)), origem: 'manual' }, quem(c));
    if (!inserido) throw new n.ErroDeRegra('Este andamento já está lançado.', 409);
    return c.json(await n.buscarProcesso(pid), 201);
  });
  esc.patch('/andamentos/:id', async (c) => c.json(await n.editarAndamento(id(c.req.param('id')), await corpo(c), quem(c))));
  esc.post('/processos/:id/sincronizar', async (c) => {
    if (!datajud.datajudConfigurado()) throw new n.ErroDeRegra('Consulta automática desligada. Configure DATAJUD_API_KEY.', 503);
    try {
      return c.json(await datajud.sincronizarProcesso(id(c.req.param('id'))));
    } catch (e) {
      throw e instanceof n.ErroDeRegra ? e : new n.ErroDeRegra(`Não foi possível consultar o tribunal: ${e.message}`, 502);
    }
  });
  esc.post('/processos/:id/explicar', async (c) =>
    c.json({ texto: await ia.explicarAndamento(id(c.req.param('id')), String((await corpo(c)).descricao || '').slice(0, 4000), c.get('usuario')) }));

  esc.get('/mensagens', async (c) => c.json(await n.caixaDeEntrada()));
  esc.get('/mensagens/:clienteId', async (c) => {
    const cid = id(c.req.param('clienteId'));
    await n.marcarLidas(cid, true);
    return c.json(await n.listarConversa(cid));
  });
  esc.post('/mensagens/:clienteId', async (c) =>
    c.json(await n.enviarMensagem(id(c.req.param('clienteId')), quem(c), (await corpo(c)).texto, true), 201));
  esc.post('/mensagens/:clienteId/sugestao', async (c) =>
    c.json({ texto: await ia.sugerirResposta(id(c.req.param('clienteId')), c.get('usuario')) }));

  esc.post('/clientes/:id/documentos', async (c) => {
    const cid = id(c.req.param('id'));
    const r = await receberArquivo(c);
    try {
      return c.json(await n.criarDocumento({
        cliente_id: cid, processo_id: r.form.processo_id ? id(r.form.processo_id) : null, tipo: r.form.tipo,
        titulo: String(r.form.titulo || '').slice(0, 200), status: r.form.status || 'disponivel',
        arquivo: r.arquivo, nome_original: r.nome_original, mime: r.mime, tamanho: r.tamanho,
      }, quem(c)), 201);
    } catch (e) {
      await arquivos().apagar(r.arquivo);
      throw e;
    }
  });
  esc.patch('/documentos/:id', async (c) => c.json(await n.alterarStatusDocumento(id(c.req.param('id')), (await corpo(c)).status, quem(c))));

  esc.get('/cobrancas', async (c) => c.json(await n.listarCobrancas({ situacao: c.req.query('situacao') || undefined })));
  esc.post('/cobrancas', async (c) => c.json(await n.criarCobrancas(await corpo(c), quem(c)), 201));
  esc.patch('/cobrancas/:id', async (c) => c.json(await n.alterarCobranca(id(c.req.param('id')), await corpo(c), quem(c))));
  esc.get('/inadimplentes', async (c) => c.json(await n.inadimplentes()));

  esc.get('/solicitacoes', async (c) => c.json(await n.listarSolicitacoes({ status: c.req.query('status') || undefined })));
  esc.patch('/solicitacoes/:id', async (c) => c.json(await n.responderSolicitacao(id(c.req.param('id')), await corpo(c), quem(c))));

  esc.get('/equipe', async (c) => c.json(await n.listarEquipe()));

  esc.post('/assistente', async (c) => {
    const b = await corpo(c);
    return c.json({ texto: await ia.conversarComAssistente(c.get('usuario'), Array.isArray(b.historico) ? b.historico : []) });
  });

  // Chaves de acesso do Claude (cada pessoa do escritório gerencia as suas).
  esc.get('/chaves', async (c) => c.json(await auth.listarChaves(quem(c))));
  esc.post('/chaves', async (c) => c.json({ chave: await auth.criarChave(c.get('usuario'), (await corpo(c)).nome) }, 201));
  esc.delete('/chaves/:id', async (c) => { await auth.apagarChave(quem(c), id(c.req.param('id'))); return c.json({ ok: true }); });

  // Ferramentas do Claude pela internet: a extensão MCP chama por aqui, com chave de acesso.
  esc.get('/ferramentas', (c) => c.json(ferramentas(quem(c)).map((f) => ({ nome: f.nome, descricao: f.descricao, escreve: Boolean(f.escreve) }))));
  esc.post('/ferramentas/:nome', async (c) => {
    const f = ferramentas(quem(c)).find((x) => x.nome === c.req.param('nome'));
    if (!f) throw new n.ErroDeRegra('Ferramenta não encontrada.', 404);
    const args = f.esquema.safeParse(await corpo(c));
    if (!args.success) throw new n.ErroDeRegra(`Dados inválidos: ${args.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
    return c.json(await f.executar(args.data));
  });

  // ---------------------------------------------------------- só o gestor
  const gestor = new Hono();
  gestor.use('*', soGestor);
  gestor.post('/equipe', async (c) => c.json(await auth.criarUsuario({ ...(await corpo(c)), papel: 'equipe' }, quem(c)), 201));
  gestor.post('/acesso/:id', async (c) => c.json(await n.definirAtivo(id(c.req.param('id')), Boolean((await corpo(c)).ativo), quem(c))));
  gestor.post('/senha/:id', async (c) => {
    await auth.redefinirSenha(id(c.req.param('id')), (await corpo(c)).nova, quem(c));
    return c.json({ ok: true });
  });
  gestor.get('/auditoria', async (c) => c.json(await n.auditoriaRecente(200)));
  gestor.post('/sincronizar', async (c) => c.json(await datajud.sincronizarTodos()));
  esc.route('/gestor', gestor);

  api.route('/escritorio', esc);
  api.all('*', () => { throw new n.ErroDeRegra('Rota não encontrada.', 404); });
  app.route('/api', api);

  // ---------------------------------------------------------- erros
  app.onError((err, c) => {
    if (err instanceof n.ErroDeRegra) return c.json({ erro: err.message }, err.status);
    console.error(`[erro] ${c.req.method} ${c.req.path}:`, err);
    return c.json({ erro: 'Algo deu errado do nosso lado. Tente de novo em instantes.' }, 500);
  });

  return app;
}
