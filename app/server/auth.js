// Autenticação: senhas com PBKDF2, sessão em cookie httpOnly, chaves de acesso
// para o Claude, papéis. Usa só a criptografia padrão da web (WebCrypto), que
// existe tanto no Node quanto no Cloudflare.
// Papéis: gestor (um só, controla tudo), equipe (estagiários), cliente.

import { db } from './banco.js';
import { ErroDeRegra, registrar, buscarUsuario, buscarProprio } from './nucleo.js';

export const COOKIE = 'aguillera_sessao';
const DIAS_SESSAO = 30;
// 100 mil rodadas: o máximo que o Cloudflare aceita, lento para quem tenta adivinhar senhas.
const ITERACOES = 100_000;

const texto = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const deHex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
const aleatorio = (n) => crypto.getRandomValues(new Uint8Array(n));
const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const sha = async (t) => hex(await crypto.subtle.digest('SHA-256', texto.encode(t)));

async function pbkdf2(senha, sal, iteracoes) {
  const chave = await crypto.subtle.importKey('raw', texto.encode(senha), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, 256));
}

export async function gerarHash(senha) {
  const sal = aleatorio(16);
  return `pbkdf2$${ITERACOES}$${hex(sal)}$${hex(await pbkdf2(senha, sal, ITERACOES))}`;
}

export async function conferirSenha(senha, guardado) {
  const [alg, iter, salHex, hashHex] = String(guardado).split('$');
  if (alg !== 'pbkdf2' || !salHex || !hashHex) return false;
  const obtido = await pbkdf2(senha, deHex(salHex), Number(iter));
  const esperado = deHex(hashHex);
  // Comparação em tempo constante.
  let dif = obtido.length ^ esperado.length;
  for (let i = 0; i < esperado.length; i++) dif |= obtido[i] ^ esperado[i];
  return dif === 0;
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

export async function criarUsuario({ nome, email, senha, papel, telefone, cpf, endereco, area_interesse, consentimento, origem }, autorId) {
  if (!nome?.trim()) throw new ErroDeRegra('Informe o nome.');
  const e = validarEmail(email);
  validarSenha(senha);
  if (!['gestor', 'equipe', 'cliente'].includes(papel)) throw new ErroDeRegra('Papel inválido.');
  if (papel === 'gestor' && await db().get("SELECT 1 FROM usuarios WHERE papel = 'gestor'")) {
    throw new ErroDeRegra('Já existe um gestor. O aplicativo tem um gestor só.', 409);
  }
  if (await db().get('SELECT 1 FROM usuarios WHERE email = ?', e)) throw new ErroDeRegra('Este e-mail já está cadastrado.', 409);
  const r = await db().run(`
    INSERT INTO usuarios (nome, email, senha_hash, papel, telefone, cpf, endereco, area_interesse, consentimento_lgpd_em, origem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nome.trim().slice(0, 160), e, await gerarHash(senha), papel, telefone || null, cpf || null, endereco || null,
    area_interesse || null, consentimento ? new Date().toISOString() : null,
    // De onde veio o cadastro (ex.: "site-civel"), só letras, números e hífen.
    /^[a-z0-9-]{1,40}$/.test(String(origem || '')) ? origem : null);
  await registrar(autorId ?? r.id, 'usuario.criado', { id: r.id, papel });
  return buscarUsuario(r.id);
}

// Ao trocar a senha, os outros aparelhos saem; o atual continua conectado.
export async function trocarSenha(usuarioId, atual, nova, tokenAtual) {
  const u = await db().get('SELECT senha_hash FROM usuarios WHERE id = ?', usuarioId);
  if (!u || !(await conferirSenha(String(atual || ''), u.senha_hash))) throw new ErroDeRegra('Senha atual incorreta.', 403);
  validarSenha(nova);
  await db().run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', await gerarHash(nova), usuarioId);
  await db().run('DELETE FROM sessoes WHERE usuario_id = ? AND token_hash != ?', usuarioId, tokenAtual ? await sha(tokenAtual) : '');
  await registrar(usuarioId, 'senha.trocada');
}

export async function redefinirSenha(usuarioId, nova, autorId) {
  validarSenha(nova);
  const u = await buscarUsuario(usuarioId);
  if (!u) throw new ErroDeRegra('Pessoa não encontrada.', 404);
  await db().run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', await gerarHash(nova), usuarioId);
  await db().run('DELETE FROM sessoes WHERE usuario_id = ?', usuarioId);
  await registrar(autorId, 'senha.redefinida', { id: usuarioId });
}

// ---- Proteção contra tentativa de adivinhar senhas (por endereço + e-mail).
const tentativas = new Map();
function limitarTentativas(chave) {
  const agora = Date.now();
  const t = tentativas.get(chave) || { n: 0, desde: agora };
  if (agora - t.desde > 15 * 60_000) { t.n = 0; t.desde = agora; }
  t.n += 1;
  tentativas.set(chave, t);
  if (tentativas.size > 10_000) tentativas.clear();
  if (t.n > 10) throw new ErroDeRegra('Muitas tentativas. Aguarde 15 minutos e tente de novo.', 429);
}

export async function entrar(email, senha, ip) {
  const e = String(email || '').trim().toLowerCase();
  limitarTentativas(`${ip}|${e}`);
  const u = await db().get('SELECT * FROM usuarios WHERE email = ?', e);
  // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem cadastro.
  if (!u || !(await conferirSenha(String(senha || ''), u.senha_hash))) throw new ErroDeRegra('E-mail ou senha incorretos.', 401);
  if (!u.ativo) throw new ErroDeRegra('Seu acesso está desativado. Fale com o escritório.', 403);
  tentativas.delete(`${ip}|${e}`);
  const token = base64url(aleatorio(32));
  const expira = new Date(Date.now() + DIAS_SESSAO * 86_400_000).toISOString();
  await db().run('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)', await sha(token), u.id, expira);
  await db().run("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?", u.id);
  await db().run('DELETE FROM sessoes WHERE expira_em < ?', new Date().toISOString());
  return { token, usuario: await buscarProprio(u.id) };
}

export async function sair(token) {
  if (token) await db().run('DELETE FROM sessoes WHERE token_hash = ?', await sha(token));
}

export function lerCookie(cabecalho) {
  for (const parte of String(cabecalho || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) {
      try { return decodeURIComponent(v.join('=')); } catch { return null; }
    }
  }
  return null;
}

export function textoCookie(token, seguro) {
  const idade = token ? DIAS_SESSAO * 86_400 : 0;
  return `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${idade}${seguro ? '; Secure' : ''}`;
}

// Quem está fazendo o pedido: pela sessão (cookie) ou por uma chave de acesso (Claude).
export async function identificar({ cookie, autorizacao }) {
  const token = lerCookie(cookie);
  if (token) {
    const s = await db().get(`
      SELECT u.id, u.nome, u.email, u.papel, u.ativo FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expira_em > ?`, await sha(token), new Date().toISOString());
    if (s?.ativo) return { usuario: { ...s }, token, porChave: false };
  }
  const m = /^Bearer\s+(agl_[A-Za-z0-9_-]{20,})$/.exec(String(autorizacao || ''));
  if (m) {
    const k = await db().get(`
      SELECT u.id, u.nome, u.email, u.papel, u.ativo, c.token_hash FROM chaves_api c JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.token_hash = ?`, await sha(m[1]));
    if (k?.ativo && k.papel !== 'cliente') {
      await db().run("UPDATE chaves_api SET ultimo_uso = datetime('now') WHERE token_hash = ?", k.token_hash);
      const { token_hash: _h, ...usuario } = k;
      return { usuario, token: null, porChave: true };
    }
  }
  return { usuario: null, token, porChave: false };
}

// ---- Chaves de acesso: deixam o Claude (Desktop/Code) operar o sistema em nome da pessoa.
export async function criarChave(usuario, nome) {
  if (!ehEscritorio(usuario)) throw new ErroDeRegra('Só o escritório usa chaves de acesso.', 403);
  const chave = `agl_${base64url(aleatorio(24))}`;
  await db().run('INSERT INTO chaves_api (token_hash, usuario_id, nome) VALUES (?, ?, ?)',
    await sha(chave), usuario.id, String(nome || 'Claude').trim().slice(0, 60) || 'Claude');
  await registrar(usuario.id, 'chave.criada', { nome });
  return chave;
}

export const listarChaves = (usuarioId) =>
  db().all('SELECT id, nome, criado_em, ultimo_uso FROM chaves_api WHERE usuario_id = ? ORDER BY id DESC', usuarioId);

export async function apagarChave(usuarioId, id) {
  const r = await db().run('DELETE FROM chaves_api WHERE id = ? AND usuario_id = ?', id, usuarioId);
  if (!r.changes) throw new ErroDeRegra('Chave não encontrada.', 404);
  await registrar(usuarioId, 'chave.apagada', { id });
}

export const ehEscritorio = (u) => Boolean(u) && (u.papel === 'gestor' || u.papel === 'equipe');

// Cliente só enxerga o que é dele; escritório enxerga tudo.
export function podeVerCliente(usuario, clienteId) {
  return ehEscritorio(usuario) || usuario?.id === Number(clienteId);
}
