// Monta o aplicativo web: API em /api e telas em /.

import express from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import escritorio from '../config/escritorio.js';
import * as n from './nucleo.js';
import * as auth from './auth.js';
import * as ia from './claude.js';
import * as datajud from './datajud.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_ARQUIVOS = resolve(raiz, process.env.UPLOADS_DIR || 'data/arquivos');
const TIPOS_ACEITOS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
};

// Envolve rotas assíncronas para que qualquer erro chegue ao tratador final.
const r = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const id = (v) => {
  const x = Number(v);
  if (!Number.isInteger(x) || x <= 0) throw new n.ErroDeRegra('Identificador inválido.', 400);
  return x;
};

export function criarApp() {
  mkdirSync(PASTA_ARQUIVOS, { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  // Só confie no IP repassado se houver proxy de verdade na frente (Render, Railway, Caddy…);
  // sem proxy, um X-Forwarded-For falso burlaria o limite de tentativas de login.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(auth.identificar);

  // Proteção contra requisições forjadas (CSRF): toda escrita na API precisa
  // do cabeçalho X-Aguillera, que só o próprio aplicativo envia.
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    next(req.get('X-Aguillera') === '1' ? undefined : new n.ErroDeRegra('Requisição recusada.', 403));
  });

  const api = express.Router();
  app.use('/api', api);

  const upload = multer({
    storage: multer.diskStorage({
      destination: PASTA_ARQUIVOS,
      filename: (_req, file, cb) => cb(null, randomBytes(18).toString('hex') + (TIPOS_ACEITOS[file.mimetype] || '')),
    }),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => cb(TIPOS_ACEITOS[file.mimetype] ? null : new n.ErroDeRegra('Envie PDF, imagem (JPG/PNG/WEBP) ou Word.'), Boolean(TIPOS_ACEITOS[file.mimetype])),
  });

  // ------------------------------------------------------------ público
  api.get('/marca', (_req, res) => {
    const { pagamento, ...publico } = escritorio;
    res.json({ ...publico, pagamento, recursos: { claude: ia.claudeConfigurado(), datajud: datajud.datajudConfigurado() } });
  });

  api.post('/cadastro', r((req, res) => {
    const b = req.body || {};
    if (!b.consentimento) throw new n.ErroDeRegra('É preciso concordar com o tratamento dos dados (LGPD) para criar a conta.');
    auth.criarUsuario({ ...b, papel: 'cliente' });
    const { token, usuario } = auth.entrar(b.email, b.senha, req.ip);
    auth.gravarCookie(res, token);
    res.status(201).json({ usuario });
  }));

  api.post('/entrar', r((req, res) => {
    const { token, usuario } = auth.entrar(req.body?.email, req.body?.senha, req.ip);
    auth.gravarCookie(res, token);
    res.json({ usuario });
  }));

  api.post('/sair', (req, res) => {
    auth.sair(req.token);
    auth.gravarCookie(res, null);
    res.json({ ok: true });
  });

  api.get('/eu', (req, res) => {
    res.json({ usuario: req.usuario ? n.buscarProprio(req.usuario.id) : null });
  });

  // ------------------------------------------------------------ conta (qualquer pessoa logada)
  api.use(auth.exigirLogin);

  api.patch('/eu', r((req, res) => {
    res.json({ usuario: n.atualizarProprioPerfil(req.usuario, req.body || {}) });
  }));

  api.post('/eu/senha', r((req, res) => {
    auth.trocarSenha(req.usuario.id, req.body?.atual, req.body?.nova, req.token);
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------ área do cliente
  const cliente = express.Router();
  api.use('/cliente', (req, _res, next) => next(req.usuario.papel === 'cliente' ? undefined : new n.ErroDeRegra('Área do cliente.', 403)), cliente);

  cliente.get('/inicio', (req, res) => res.json(n.inicioDoCliente(req.usuario.id)));
  cliente.get('/processos', (req, res) => res.json(n.listarProcessos({ clienteId: req.usuario.id, apenasVisivel: true })));
  cliente.get('/processos/:id', r((req, res) => {
    const p = n.buscarProcesso(id(req.params.id), { apenasVisivel: true });
    if (p.cliente_id !== req.usuario.id) throw new n.ErroDeRegra('Processo não encontrado.', 404);
    res.json(p);
  }));
  cliente.get('/mensagens', r((req, res) => {
    n.marcarLidas(req.usuario.id, false);
    res.json(n.listarConversa(req.usuario.id));
  }));
  cliente.post('/mensagens', r((req, res) => res.status(201).json(n.enviarMensagem(req.usuario.id, req.usuario.id, req.body?.texto, false))));
  cliente.get('/documentos', (req, res) => res.json(n.listarDocumentos(req.usuario.id)));
  cliente.post('/documentos', upload.single('arquivo'), r((req, res) => {
    if (!req.file) throw new n.ErroDeRegra('Escolha um arquivo.');
    const tipo = ['documento_pessoal', 'comprovante', 'outro'].includes(req.body?.tipo) ? req.body.tipo : 'outro';
    res.status(201).json(n.criarDocumento({
      cliente_id: req.usuario.id, tipo, titulo: String(req.body?.titulo || '').slice(0, 200) || n.TIPOS_DOCUMENTO[tipo],
      arquivo: req.file.filename, nome_original: req.file.originalname.slice(0, 200), mime: req.file.mimetype, tamanho: req.file.size,
    }, req.usuario.id));
  }));
  cliente.get('/cobrancas', (req, res) => res.json(n.listarCobrancas({ clienteId: req.usuario.id })));
  cliente.get('/solicitacoes', (req, res) => res.json(n.listarSolicitacoes({ clienteId: req.usuario.id })));
  cliente.post('/solicitacoes', r((req, res) => res.status(201).json(n.criarSolicitacao(req.usuario.id, req.body || {}))));

  // ------------------------------------------------------------ download de documento (cliente dono ou escritório)
  api.get('/documentos/:id/arquivo', r((req, res) => {
    const d = n.buscarDocumento(id(req.params.id));
    if (!auth.podeVerCliente(req.usuario, d.cliente_id)) throw new n.ErroDeRegra('Documento não encontrado.', 404);
    const caminho = resolve(PASTA_ARQUIVOS, d.arquivo);
    if (!caminho.startsWith(PASTA_ARQUIVOS) || !existsSync(caminho)) throw new n.ErroDeRegra('Arquivo indisponível.', 404);
    const nome = d.nome_original.replace(/[^\w.\- À-ú]/g, '_');
    res.setHeader('Content-Disposition', `${req.query.ver ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(nome)}`);
    res.type(d.mime).sendFile(caminho);
  }));

  // ------------------------------------------------------------ escritório (gestor + equipe)
  const esc = express.Router();
  api.use('/escritorio', auth.exigirEscritorio, esc);

  esc.get('/painel', (_req, res) => res.json(n.painel()));

  esc.get('/clientes', (req, res) => res.json(n.listarClientes({ busca: String(req.query.busca || ''), situacao: String(req.query.situacao || 'todos') })));
  esc.post('/clientes', r((req, res) => {
    const novo = auth.criarUsuario({ ...req.body, papel: 'cliente' }, req.usuario.id);
    res.status(201).json(novo);
  }));
  esc.get('/clientes/:id', r((req, res) => {
    const cid = id(req.params.id);
    res.json({
      cliente: n.exigirCliente(cid),
      processos: n.listarProcessos({ clienteId: cid }),
      cobrancas: n.listarCobrancas({ clienteId: cid }),
      documentos: n.listarDocumentos(cid),
      solicitacoes: n.listarSolicitacoes({ clienteId: cid }),
    });
  }));
  esc.patch('/clientes/:id', r((req, res) => res.json(n.atualizarCliente(id(req.params.id), req.body || {}, req.usuario.id))));

  esc.get('/processos', (req, res) => res.json(n.listarProcessos({ busca: String(req.query.busca || ''), status: req.query.status || undefined })));
  esc.post('/processos', r((req, res) => res.status(201).json(n.criarProcesso(req.body || {}, req.usuario.id))));
  esc.get('/processos/:id', r((req, res) => res.json(n.buscarProcesso(id(req.params.id)))));
  esc.patch('/processos/:id', r((req, res) => res.json(n.atualizarProcesso(id(req.params.id), req.body || {}, req.usuario.id))));
  esc.post('/processos/:id/andamentos', r((req, res) => {
    const pid = id(req.params.id);
    const { inserido } = n.registrarAndamento(pid, { ...req.body, origem: 'manual' }, req.usuario.id);
    if (!inserido) throw new n.ErroDeRegra('Este andamento já está lançado.', 409);
    res.status(201).json(n.buscarProcesso(pid));
  }));
  esc.patch('/andamentos/:id', r((req, res) => res.json(n.editarAndamento(id(req.params.id), req.body || {}, req.usuario.id))));
  esc.post('/processos/:id/sincronizar', r(async (req, res) => {
    if (!datajud.datajudConfigurado()) throw new n.ErroDeRegra('Consulta automática desligada. Configure DATAJUD_API_KEY no .env.', 503);
    try {
      res.json(await datajud.sincronizarProcesso(id(req.params.id)));
    } catch (e) {
      throw e instanceof n.ErroDeRegra ? e : new n.ErroDeRegra(`Não foi possível consultar o tribunal: ${e.message}`, 502);
    }
  }));
  esc.post('/processos/:id/explicar', r(async (req, res) => {
    res.json({ texto: await ia.explicarAndamento(id(req.params.id), String(req.body?.descricao || '').slice(0, 4000), req.usuario) });
  }));

  esc.get('/mensagens', (_req, res) => res.json(n.caixaDeEntrada()));
  esc.get('/mensagens/:clienteId', r((req, res) => {
    const cid = id(req.params.clienteId);
    n.marcarLidas(cid, true);
    res.json(n.listarConversa(cid));
  }));
  esc.post('/mensagens/:clienteId', r((req, res) => res.status(201).json(n.enviarMensagem(id(req.params.clienteId), req.usuario.id, req.body?.texto, true))));
  esc.post('/mensagens/:clienteId/sugestao', r(async (req, res) => res.json({ texto: await ia.sugerirResposta(id(req.params.clienteId), req.usuario) })));

  esc.post('/clientes/:id/documentos', upload.single('arquivo'), r((req, res) => {
    if (!req.file) throw new n.ErroDeRegra('Escolha um arquivo.');
    const tipo = req.body?.tipo;
    try {
      res.status(201).json(n.criarDocumento({
        cliente_id: id(req.params.id), processo_id: req.body?.processo_id ? id(req.body.processo_id) : null, tipo,
        titulo: String(req.body?.titulo || '').slice(0, 200), status: req.body?.status || 'disponivel',
        arquivo: req.file.filename, nome_original: req.file.originalname.slice(0, 200), mime: req.file.mimetype, tamanho: req.file.size,
      }, req.usuario.id));
    } catch (e) {
      unlinkSync(req.file.path);
      throw e;
    }
  }));
  esc.patch('/documentos/:id', r((req, res) => res.json(n.alterarStatusDocumento(id(req.params.id), req.body?.status, req.usuario.id))));

  esc.get('/cobrancas', (req, res) => res.json(n.listarCobrancas({ situacao: req.query.situacao || undefined })));
  esc.post('/cobrancas', r((req, res) => res.status(201).json(n.criarCobrancas(req.body || {}, req.usuario.id))));
  esc.patch('/cobrancas/:id', r((req, res) => res.json(n.alterarCobranca(id(req.params.id), req.body || {}, req.usuario.id))));
  esc.get('/inadimplentes', (_req, res) => res.json(n.inadimplentes()));

  esc.get('/solicitacoes', (req, res) => res.json(n.listarSolicitacoes({ status: req.query.status || undefined })));
  esc.patch('/solicitacoes/:id', r((req, res) => res.json(n.responderSolicitacao(id(req.params.id), req.body || {}, req.usuario.id))));

  esc.get('/equipe', (_req, res) => res.json(n.listarEquipe()));

  esc.post('/assistente', r(async (req, res) => {
    const historico = Array.isArray(req.body?.historico) ? req.body.historico : [];
    res.json({ texto: await ia.conversarComAssistente(req.usuario, historico) });
  }));

  // ------------------------------------------------------------ só o gestor
  const gestor = express.Router();
  esc.use('/gestor', auth.exigirGestor, gestor);

  gestor.post('/equipe', r((req, res) => res.status(201).json(auth.criarUsuario({ ...req.body, papel: 'equipe' }, req.usuario.id))));
  gestor.post('/acesso/:id', r((req, res) => res.json(n.definirAtivo(id(req.params.id), Boolean(req.body?.ativo), req.usuario.id))));
  gestor.post('/senha/:id', r((req, res) => {
    auth.redefinirSenha(id(req.params.id), req.body?.nova, req.usuario.id);
    res.json({ ok: true });
  }));
  gestor.get('/auditoria', (_req, res) => res.json(n.auditoriaRecente(200)));
  gestor.post('/sincronizar', r(async (_req, res) => res.json(await datajud.sincronizarTodos())));

  api.use((_req, _res, next) => next(new n.ErroDeRegra('Rota não encontrada.', 404)));

  // ------------------------------------------------------------ telas
  app.use(express.static(resolve(raiz, 'public'), { index: 'index.html', maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(raiz, 'public/index.html')));

  // ------------------------------------------------------------ erros
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ erro: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo maior que 15 MB.' : 'Falha no envio do arquivo.' });
    }
    if (err instanceof n.ErroDeRegra) return res.status(err.status).json({ erro: err.message });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados inválidos.' });
    console.error(`[erro] ${req.method} ${req.path}:`, err);
    res.status(500).json({ erro: 'Algo deu errado do nosso lado. Tente de novo em instantes.' });
  });

  return app;
}
