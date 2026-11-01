// Autenticação: senhas com scrypt, sessão em cookie httpOnly, papéis.
// Papéis: gestor (um só, controla tudo), equipe (estagiários), cliente.

import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { abrirBanco } from './db.js';
import { ErroDeRegra, registrar, buscarUsuario, buscarProprio } from './nucleo.js';

const db = () => abrirBanco();
const COOKIE = 'aguillera_sessao';
const DIAS_SESSAO = 30;

export function gerarHash(senha) {
  const sal = randomBytes(16);
  const hash = scryptSync(senha, sal, 64);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

export function conferirSenha(senha, guardado) {
  const [alg, salHex, hashHex] = String(guardado).split('$');
  if (alg !== 'scrypt' || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const obtido = scryptSync(senha, Buffer.from(salHex, 'hex'), esperado.length);
  return timingSafeEqual(esperado, obtido);
}

export function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 8) throw new ErroDeRegra('A senha precisa ter pelo menos 8 caracteres.');
  if (senha.length > 200) throw new ErroDeRegra('Senha longa demais.');
}

export function validarEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ErroDeRegra('E-mail inválido.');
  return e;
}

const sha = (t) => createHash('sha256').update(t).digest('hex');

export function criarUsuario({ nome, email, senha, papel, telefone, cpf, endereco, area_interesse, consentimento, origem }, autorId) {
  if (!nome?.trim()) throw new ErroDeRegra('Informe o nome.');
  const e = validarEmail(email);
  validarSenha(senha);
  if (!['gestor', 'equipe', 'cliente'].includes(papel)) throw new ErroDeRegra('Papel inválido.');
  if (papel === 'gestor' && db().prepare("SELECT 1 FROM usuarios WHERE papel = 'gestor'").get()) {
    throw new ErroDeRegra('Já existe um gestor. O aplicativo tem um gestor só.', 409);
  }
  if (db().prepare('SELECT 1 FROM usuarios WHERE email = ?').get(e)) throw new ErroDeRegra('Este e-mail já está cadastrado.', 409);
  const r = db().prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, papel, telefone, cpf, endereco, area_interesse, consentimento_lgpd_em, origem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    nome.trim().slice(0, 160), e, gerarHash(senha), papel, telefone || null, cpf || null, endereco || null,
    area_interesse || null, consentimento ? new Date().toISOString() : null,
    // De onde veio o cadastro (ex.: "site-civel"), só letras, números e hífen.
    /^[a-z0-9-]{1,40}$/.test(String(origem || '')) ? origem : null);
  const id = Number(r.lastInsertRowid);
  registrar(autorId ?? id, 'usuario.criado', { id, papel });
  return buscarUsuario(id);
}

// Ao trocar a senha, os outros aparelhos saem; o atual continua conectado.
export function trocarSenha(usuarioId, atual, nova, tokenAtual) {
  const u = db().prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(usuarioId);
  if (!u || !conferirSenha(atual, u.senha_hash)) throw new ErroDeRegra('Senha atual incorreta.', 403);
  validarSenha(nova);
  db().prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(gerarHash(nova), usuarioId);
  db().prepare('DELETE FROM sessoes WHERE usuario_id = ? AND token_hash != ?').run(usuarioId, tokenAtual ? sha(tokenAtual) : '');
  registrar(usuarioId, 'senha.trocada');
}

export function redefinirSenha(usuarioId, nova, autorId) {
  validarSenha(nova);
  const u = buscarUsuario(usuarioId);
  if (!u) throw new ErroDeRegra('Pessoa não encontrada.', 404);
  db().prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(gerarHash(nova), usuarioId);
  db().prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(usuarioId);
  registrar(autorId, 'senha.redefinida', { id: usuarioId });
}

// ---- Proteção simples contra tentativa de adivinhar senhas.
const tentativas = new Map();
function limitarTentativas(chave) {
  const agora = Date.now();
  const t = tentativas.get(chave) || { n: 0, desde: agora };
  if (agora - t.desde > 15 * 60_000) { t.n = 0; t.desde = agora; }
  t.n += 1;
  tentativas.set(chave, t);
  if (t.n > 10) throw new ErroDeRegra('Muitas tentativas. Aguarde 15 minutos e tente de novo.', 429);
}

export function entrar(email, senha, ip) {
  const e = String(email || '').trim().toLowerCase();
  limitarTentativas(`${ip}|${e}`);
  const u = db().prepare('SELECT * FROM usuarios WHERE email = ?').get(e);
  // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem cadastro.
  if (!u || !conferirSenha(String(senha || ''), u.senha_hash)) throw new ErroDeRegra('E-mail ou senha incorretos.', 401);
  if (!u.ativo) throw new ErroDeRegra('Seu acesso está desativado. Fale com o escritório.', 403);
  tentativas.delete(`${ip}|${e}`);
  const token = randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + DIAS_SESSAO * 86_400_000).toISOString();
  db().prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)').run(sha(token), u.id, expira);
  db().prepare("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?").run(u.id);
  db().prepare("DELETE FROM sessoes WHERE expira_em < ?").run(new Date().toISOString());
  return { token, usuario: buscarProprio(u.id) };
}

export function sair(token) {
  if (token) db().prepare('DELETE FROM sessoes WHERE token_hash = ?').run(sha(token));
}

function lerCookie(req) {
  const bruto = req.headers.cookie || '';
  for (const parte of bruto.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function gravarCookie(res, token) {
  const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const idade = token ? DIAS_SESSAO * 86_400 : 0;
  res.setHeader('Set-Cookie', `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${idade}${seguro}`);
}

// Middleware: identifica quem está logado (ou ninguém).
export function identificar(req, _res, next) {
  const token = lerCookie(req);
  req.token = token;
  req.usuario = null;
  if (token) {
    const s = db().prepare(`
      SELECT u.id, u.nome, u.email, u.papel, u.ativo FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expira_em > ?`).get(sha(token), new Date().toISOString());
    if (s && s.ativo) req.usuario = { ...s };
  }
  next();
}

// Guardas de rota.
export const exigirLogin = (req, _res, next) =>
  next(req.usuario ? undefined : new ErroDeRegra('Entre na sua conta para continuar.', 401));

export const exigirEscritorio = (req, _res, next) =>
  next(req.usuario && ['gestor', 'equipe'].includes(req.usuario.papel) ? undefined : new ErroDeRegra('Acesso restrito ao escritório.', 403));

export const exigirGestor = (req, _res, next) =>
  next(req.usuario?.papel === 'gestor' ? undefined : new ErroDeRegra('Apenas o gestor pode fazer isso.', 403));

export const ehEscritorio = (u) => u && (u.papel === 'gestor' || u.papel === 'equipe');

// Cliente só enxerga o que é dele; escritório enxerga tudo.
export function podeVerCliente(usuario, clienteId) {
  return ehEscritorio(usuario) || usuario?.id === Number(clienteId);
}
