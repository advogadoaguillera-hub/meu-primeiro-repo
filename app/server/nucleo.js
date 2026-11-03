// Núcleo de regras do escritório.
// Toda leitura e escrita de dados passa por aqui — as rotas do aplicativo,
// o assistente Claude dentro do app e a extensão MCP usam as MESMAS funções.
// Assim o Claude nunca enxerga ou faz algo que o próprio app não faria.

import escritorio from '../config/escritorio.js';
import { db } from './banco.js';

export class ErroDeRegra extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

// ---------------------------------------------------------------- datas
// "Hoje" é sempre o do escritório (Corumbá), não o do servidor: o Cloudflare
// trabalha em Greenwich, e depois das 20h a cobrança do dia apareceria atrasada.
const FUSO = escritorio.fuso || 'America/Campo_Grande';
const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });

export const hoje = (deslocamentoDias = 0) => formatoDia.format(new Date(Date.now() + deslocamentoDias * 86_400_000));

// Início de um dia de Corumbá no formato UTC em que o banco grava (criado_em).
export function inicioDoDiaUtc(diaLocal) {
  const base = new Date(`${diaLocal}T00:00:00Z`);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(base).map((x) => [x.type, x.value]));
  const comoLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(base.getTime() - (comoLocal - base.getTime())).toISOString().slice(0, 19).replace('T', ' ');
}

// ---------------------------------------------------------------- auditoria
export async function registrar(usuarioId, acao, detalhe, origem = 'app') {
  await db().run('INSERT INTO auditoria (usuario_id, origem, acao, detalhe) VALUES (?, ?, ?, ?)',
    usuarioId ?? null, origem, acao, detalhe == null ? null : JSON.stringify(detalhe));
}

// ---------------------------------------------------------------- pessoas
const CAMPOS_PUBLICOS = 'id, nome, email, papel, ativo, telefone, cpf, endereco, area_interesse, origem, observacoes, criado_em, ultimo_acesso';

export function buscarUsuario(id) {
  return db().get(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`, id);
}

// O próprio usuário não vê as observações internas que o escritório guarda sobre ele.
export async function buscarProprio(id) {
  const u = await buscarUsuario(id);
  if (!u) return u;
  const { observacoes: _interno, ...proprio } = u;
  return proprio;
}

export async function exigirCliente(id) {
  const c = await db().get(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ? AND papel = 'cliente'`, id);
  if (!c) throw new ErroDeRegra('Cliente não encontrado.', 404);
  return c;
}

export async function listarClientes({ busca = '', situacao = 'todos' } = {}) {
  const termo = `%${String(busca).trim()}%`;
  const linhas = await db().all(`
    SELECT u.id, u.nome, u.email, u.telefone, u.area_interesse, u.origem, u.ativo, u.criado_em, u.ultimo_acesso,
      (SELECT COUNT(*) FROM processos p WHERE p.cliente_id = u.id AND p.status = 'ativo') AS processos_ativos,
      (SELECT COALESCE(SUM(valor_centavos),0) FROM cobrancas c
         WHERE c.cliente_id = u.id AND c.status = 'aberta' AND c.vencimento < ?) AS em_atraso_centavos,
      (SELECT COALESCE(SUM(valor_centavos),0) FROM cobrancas c
         WHERE c.cliente_id = u.id AND c.status = 'paga') AS pago_centavos,
      (SELECT COUNT(*) FROM mensagens m WHERE m.cliente_id = u.id AND m.do_escritorio = 0 AND m.lida = 0) AS mensagens_nao_lidas
    FROM usuarios u
    WHERE u.papel = 'cliente'
      AND (u.nome LIKE ? OR u.email LIKE ? OR COALESCE(u.cpf,'') LIKE ? OR COALESCE(u.telefone,'') LIKE ?)
    ORDER BY u.nome COLLATE NOCASE
  `, hoje(), termo, termo, termo, termo);

  return linhas.filter((c) => {
    if (situacao === 'inadimplentes') return c.em_atraso_centavos > 0;
    if (situacao === 'em_dia') return c.ativo && c.em_atraso_centavos === 0;
    if (situacao === 'inativos') return !c.ativo;
    return true;
  });
}

export async function atualizarCliente(id, dados, autorId, origem) {
  await exigirCliente(id);
  const permitidos = ['nome', 'telefone', 'cpf', 'endereco', 'area_interesse', 'observacoes'];
  const campos = permitidos.filter((k) => dados[k] !== undefined);
  if (!campos.length) return buscarUsuario(id);
  if (campos.includes('nome') && !String(dados.nome).trim()) throw new ErroDeRegra('Informe o nome.');
  await db().run(`UPDATE usuarios SET ${campos.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...campos.map((k) => (dados[k] === '' ? null : String(dados[k]))), id);
  await registrar(autorId, 'cliente.atualizado', { id, campos }, origem);
  return buscarUsuario(id);
}

// Cada pessoa edita apenas os próprios dados de contato.
export async function atualizarProprioPerfil(usuario, dados) {
  const permitidos = usuario.papel === 'cliente' ? ['nome', 'telefone', 'endereco'] : ['nome', 'telefone'];
  const campos = permitidos.filter((k) => dados[k] !== undefined);
  if (campos.includes('nome') && !String(dados.nome).trim()) throw new ErroDeRegra('Informe o nome.');
  if (campos.length) {
    await db().run(`UPDATE usuarios SET ${campos.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      ...campos.map((k) => String(dados[k]).trim().slice(0, 300) || null), usuario.id);
  }
  return buscarProprio(usuario.id);
}

export async function definirAtivo(id, ativo, autorId, origem) {
  const u = await buscarUsuario(id);
  if (!u) throw new ErroDeRegra('Pessoa não encontrada.', 404);
  if (u.papel === 'gestor') throw new ErroDeRegra('O acesso do gestor não pode ser desativado.', 403);
  await db().run('UPDATE usuarios SET ativo = ? WHERE id = ?', ativo ? 1 : 0, id);
  if (!ativo) await db().run('DELETE FROM sessoes WHERE usuario_id = ?', id);
  await registrar(autorId, ativo ? 'acesso.reativado' : 'acesso.revogado', { id, nome: u.nome }, origem);
  return buscarUsuario(id);
}

export function listarEquipe() {
  return db().all(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE papel IN ('gestor','equipe') ORDER BY papel DESC, nome`);
}

// ---------------------------------------------------------------- processos
export function listarProcessos({ clienteId, status, busca = '', apenasVisivel = false } = {}) {
  const filtros = [];
  const args = [];
  if (clienteId) { filtros.push('p.cliente_id = ?'); args.push(clienteId); }
  if (status) { filtros.push('p.status = ?'); args.push(status); }
  if (String(busca).trim()) {
    filtros.push('(p.titulo LIKE ? OR COALESCE(p.numero_cnj,\'\') LIKE ? OR u.nome LIKE ?)');
    const t = `%${String(busca).trim()}%`;
    args.push(t, t, t);
  }
  const vis = apenasVisivel ? 'AND a.visivel_cliente = 1' : '';
  return db().all(`
    SELECT p.*, u.nome AS cliente_nome, r.nome AS responsavel_nome,
      (SELECT strftime('%d/%m/%Y', a.data) || ' — ' || a.descricao FROM andamentos a WHERE a.processo_id = p.id ${vis}
         ORDER BY a.data DESC, a.id DESC LIMIT 1) AS ultimo_andamento
    FROM processos p
    JOIN usuarios u ON u.id = p.cliente_id
    LEFT JOIN usuarios r ON r.id = p.responsavel_id
    ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
    ORDER BY p.atualizado_em DESC
  `, ...args);
}

export async function buscarProcesso(id, { apenasVisivel = false } = {}) {
  const p = await db().get(`
    SELECT p.*, u.nome AS cliente_nome, r.nome AS responsavel_nome
    FROM processos p JOIN usuarios u ON u.id = p.cliente_id
    LEFT JOIN usuarios r ON r.id = p.responsavel_id WHERE p.id = ?`, id);
  if (!p) throw new ErroDeRegra('Processo não encontrado.', 404);
  p.andamentos = await db().all(`
    SELECT a.*, u.nome AS autor_nome FROM andamentos a LEFT JOIN usuarios u ON u.id = a.autor_id
    WHERE a.processo_id = ? ${apenasVisivel ? 'AND a.visivel_cliente = 1' : ''}
    ORDER BY a.data DESC, a.id DESC`, id);
  return p;
}

export function normalizarCnj(numero) {
  if (!numero) return null;
  const d = String(numero).replace(/\D/g, '');
  if (d.length !== 20) throw new ErroDeRegra('O número do processo deve ter 20 dígitos (padrão CNJ).');
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
}

export async function criarProcesso(dados, autorId, origem) {
  await exigirCliente(dados.cliente_id);
  if (!dados.titulo?.trim()) throw new ErroDeRegra('Informe o título do processo.');
  const r = await db().run(`
    INSERT INTO processos (cliente_id, numero_cnj, titulo, area, tribunal, responsavel_id)
    VALUES (?, ?, ?, ?, ?, ?)`,
    dados.cliente_id, normalizarCnj(dados.numero_cnj), dados.titulo.trim(),
    dados.area || null, dados.tribunal || null, dados.responsavel_id || null);
  await registrar(autorId, 'processo.criado', { id: r.id, titulo: dados.titulo }, origem);
  return buscarProcesso(r.id);
}

export async function atualizarProcesso(id, dados, autorId, origem) {
  await buscarProcesso(id);
  const permitidos = ['titulo', 'area', 'tribunal', 'status', 'responsavel_id', 'numero_cnj', 'sincronizar'];
  const campos = permitidos.filter((k) => dados[k] !== undefined);
  if (dados.status && !['ativo', 'suspenso', 'arquivado', 'encerrado'].includes(dados.status)) {
    throw new ErroDeRegra('Situação inválida.');
  }
  if (campos.length) {
    const valores = campos.map((k) => {
      if (k === 'numero_cnj') return normalizarCnj(dados[k]);
      if (k === 'sincronizar') return dados[k] ? 1 : 0;
      return dados[k] === '' ? null : dados[k];
    });
    await db().run(`UPDATE processos SET ${campos.map((k) => `${k} = ?`).join(', ')}, atualizado_em = datetime('now') WHERE id = ?`,
      ...valores, id);
    await registrar(autorId, 'processo.atualizado', { id, campos }, origem);
  }
  return buscarProcesso(id);
}

export async function registrarAndamento(processoId, { data, descricao, explicacao, visivel_cliente = true, origem = 'manual' }, autorId) {
  await buscarProcesso(processoId);
  if (!descricao?.trim()) throw new ErroDeRegra('Descreva o andamento.');
  const dia = data || hoje();
  if (!/^\d{4}-\d{2}-\d{2}/.test(dia)) throw new ErroDeRegra('Data inválida (use AAAA-MM-DD).');
  const r = await db().run(`
    INSERT OR IGNORE INTO andamentos (processo_id, data, descricao, explicacao, origem, visivel_cliente, autor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    processoId, dia, descricao.trim(), explicacao?.trim() || null, origem, visivel_cliente ? 1 : 0, autorId ?? null);
  if (r.changes) {
    await db().run("UPDATE processos SET atualizado_em = datetime('now') WHERE id = ?", processoId);
    await registrar(autorId, 'andamento.registrado', { processoId, descricao: descricao.slice(0, 80) }, origem);
  }
  return { inserido: r.changes > 0, id: r.changes ? r.id : null };
}

export async function editarAndamento(id, dados, autorId, origem) {
  const a = await db().get('SELECT * FROM andamentos WHERE id = ?', id);
  if (!a) throw new ErroDeRegra('Andamento não encontrado.', 404);
  if (dados.explicacao !== undefined) await db().run('UPDATE andamentos SET explicacao = ? WHERE id = ?', dados.explicacao || null, id);
  if (dados.visivel_cliente !== undefined) await db().run('UPDATE andamentos SET visivel_cliente = ? WHERE id = ?', dados.visivel_cliente ? 1 : 0, id);
  await registrar(autorId, 'andamento.editado', { id }, origem);
  return db().get('SELECT * FROM andamentos WHERE id = ?', id);
}

// ---------------------------------------------------------------- mensagens
export async function listarConversa(clienteId) {
  await exigirCliente(clienteId);
  return db().all(`
    SELECT m.*, u.nome AS autor_nome FROM mensagens m LEFT JOIN usuarios u ON u.id = m.autor_id
    WHERE m.cliente_id = ? ORDER BY m.criado_em, m.id`, clienteId);
}

export async function enviarMensagem(clienteId, autorId, texto, doEscritorio) {
  await exigirCliente(clienteId);
  const t = String(texto || '').trim();
  if (!t) throw new ErroDeRegra('Escreva a mensagem.');
  if (t.length > 5000) throw new ErroDeRegra('Mensagem longa demais (máximo de 5.000 caracteres).');
  const r = await db().run('INSERT INTO mensagens (cliente_id, autor_id, texto, do_escritorio) VALUES (?, ?, ?, ?)',
    clienteId, autorId, t, doEscritorio ? 1 : 0);
  return db().get('SELECT m.*, u.nome AS autor_nome FROM mensagens m LEFT JOIN usuarios u ON u.id = m.autor_id WHERE m.id = ?', r.id);
}

// Quem lê marca como lidas as mensagens do OUTRO lado.
export async function marcarLidas(clienteId, leitorEhEscritorio) {
  await db().run('UPDATE mensagens SET lida = 1 WHERE cliente_id = ? AND do_escritorio = ? AND lida = 0',
    clienteId, leitorEhEscritorio ? 0 : 1);
}

export function caixaDeEntrada() {
  return db().all(`
    SELECT u.id AS cliente_id, u.nome AS cliente_nome,
      m.texto AS ultima_mensagem, m.criado_em AS ultima_em, m.do_escritorio AS ultima_do_escritorio,
      (SELECT COUNT(*) FROM mensagens x WHERE x.cliente_id = u.id AND x.do_escritorio = 0 AND x.lida = 0) AS nao_lidas
    FROM usuarios u
    JOIN mensagens m ON m.id = (SELECT id FROM mensagens WHERE cliente_id = u.id ORDER BY criado_em DESC, id DESC LIMIT 1)
    WHERE u.papel = 'cliente'
    ORDER BY nao_lidas > 0 DESC, m.criado_em DESC`);
}

// ---------------------------------------------------------------- documentos
export const TIPOS_DOCUMENTO = {
  contrato: 'Contrato de honorários',
  procuracao: 'Procuração',
  declaracao: 'Declaração',
  comprovante: 'Comprovante',
  documento_pessoal: 'Documento pessoal',
  peca: 'Peça processual',
  outro: 'Outro',
};

export function listarDocumentos(clienteId) {
  return db().all(`
    SELECT d.id, d.cliente_id, d.processo_id, d.tipo, d.titulo, d.nome_original, d.mime, d.tamanho, d.status, d.criado_em,
      u.nome AS enviado_por_nome, (u.papel != 'cliente') AS do_escritorio
    FROM documentos d LEFT JOIN usuarios u ON u.id = d.enviado_por
    WHERE d.cliente_id = ? ORDER BY d.criado_em DESC, d.id DESC`, clienteId);
}

export async function buscarDocumento(id) {
  const d = await db().get('SELECT * FROM documentos WHERE id = ?', id);
  if (!d) throw new ErroDeRegra('Documento não encontrado.', 404);
  return d;
}

export async function criarDocumento(dados, autorId) {
  await exigirCliente(dados.cliente_id);
  if (!TIPOS_DOCUMENTO[dados.tipo]) throw new ErroDeRegra('Tipo de documento inválido.');
  if (dados.status && !['disponivel', 'aguardando_assinatura', 'assinado'].includes(dados.status)) throw new ErroDeRegra('Situação inválida.');
  const r = await db().run(`
    INSERT INTO documentos (cliente_id, processo_id, tipo, titulo, arquivo, nome_original, mime, tamanho, enviado_por, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    dados.cliente_id, dados.processo_id || null, dados.tipo, dados.titulo || TIPOS_DOCUMENTO[dados.tipo],
    dados.arquivo, dados.nome_original, dados.mime, dados.tamanho, autorId, dados.status || 'disponivel');
  await registrar(autorId, 'documento.enviado', { id: r.id, tipo: dados.tipo });
  return buscarDocumento(r.id);
}

export async function alterarStatusDocumento(id, status, autorId) {
  if (!['disponivel', 'aguardando_assinatura', 'assinado'].includes(status)) throw new ErroDeRegra('Situação inválida.');
  await buscarDocumento(id);
  await db().run('UPDATE documentos SET status = ? WHERE id = ?', status, id);
  await registrar(autorId, 'documento.status', { id, status });
  return buscarDocumento(id);
}

// ---------------------------------------------------------------- financeiro
export function situacaoCobranca(c) {
  if (c.status !== 'aberta') return c.status;
  return c.vencimento < hoje() ? 'atrasada' : 'a_vencer';
}

export async function listarCobrancas({ clienteId, situacao } = {}) {
  const linhas = await db().all(`
    SELECT c.*, u.nome AS cliente_nome FROM cobrancas c JOIN usuarios u ON u.id = c.cliente_id
    ${clienteId ? 'WHERE c.cliente_id = ?' : ''}
    ORDER BY CASE c.status WHEN 'aberta' THEN 0 ELSE 1 END, c.vencimento`, ...(clienteId ? [clienteId] : []));
  const r = linhas.map((c) => ({ ...c, situacao: situacaoCobranca(c) }));
  return situacao ? r.filter((c) => c.situacao === situacao) : r;
}

export function centavos(valor) {
  // Aceita 1500, "1500", "1.500,00", "1500.50".
  let n = valor;
  if (typeof valor !== 'number') {
    const s = String(valor ?? '').trim().replace(/[R$\s]/g, '');
    n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  }
  // Número também passa pela checagem: -100 ou 0,001 não viram cobrança.
  const c = Math.round(n * 100);
  if (!Number.isFinite(c) || c <= 0) throw new ErroDeRegra('Valor inválido.');
  return c;
}

// Link de pagamento só http(s): um "javascript:" viraria script no portal do cliente.
function linkSeguro(link) {
  if (!link) return null;
  const t = String(link).trim();
  if (!/^https?:\/\/\S+$/i.test(t)) throw new ErroDeRegra('Link de pagamento inválido (use https://…).');
  return t.slice(0, 1000);
}

// Cria uma cobrança ou um parcelamento (parcelas mensais a partir do 1º vencimento).
export async function criarCobrancas({ cliente_id, descricao, valor, vencimento, parcelas = 1, processo_id, link_pagamento }, autorId, origem) {
  await exigirCliente(cliente_id);
  if (!descricao?.trim()) throw new ErroDeRegra('Descreva a cobrança.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento || '')) throw new ErroDeRegra('Vencimento inválido (use AAAA-MM-DD).');
  const n = Math.trunc(Number(parcelas) || 1);
  if (n < 1 || n > 60) throw new ErroDeRegra('Parcelas: de 1 a 60.');
  const total = centavos(valor);
  const base = Math.floor(total / n);
  if (base < 1) throw new ErroDeRegra('Valor pequeno demais para tantas parcelas.');
  const link = linkSeguro(link_pagamento);
  const resto = total - base * n;
  const [a, m, d] = vencimento.split('-').map(Number);

  const escritas = [];
  for (let i = 0; i < n; i++) {
    // Mantém o dia do vencimento; se o mês não tiver esse dia, usa o último dia do mês.
    const ultimo = new Date(Date.UTC(a, m - 1 + i + 1, 0)).getUTCDate();
    const data = new Date(Date.UTC(a, m - 1 + i, Math.min(d, ultimo))).toISOString().slice(0, 10);
    const rotulo = n > 1 ? `${descricao.trim()} — parcela ${i + 1}/${n}` : descricao.trim();
    escritas.push([`INSERT INTO cobrancas (cliente_id, processo_id, descricao, valor_centavos, vencimento, link_pagamento)
                    VALUES (?, ?, ?, ?, ?, ?)`, cliente_id, processo_id || null, rotulo, base + (i === 0 ? resto : 0), data, link]);
  }
  // Todas as parcelas gravam juntas, ou nenhuma.
  const criados = await db().lote(escritas);
  await registrar(autorId, 'cobranca.criada', { cliente_id, total, parcelas: n }, origem);
  return Promise.all(criados.map((r) => buscarCobranca(r.id)));
}

export async function buscarCobranca(id) {
  const c = await db().get('SELECT c.*, u.nome AS cliente_nome FROM cobrancas c JOIN usuarios u ON u.id = c.cliente_id WHERE c.id = ?', id);
  if (!c) throw new ErroDeRegra('Cobrança não encontrada.', 404);
  return { ...c, situacao: situacaoCobranca(c) };
}

export async function alterarCobranca(id, { status, link_pagamento, pago_em }, autorId, origem) {
  const c = await buscarCobranca(id);
  if (status) {
    if (!['aberta', 'paga', 'cancelada'].includes(status)) throw new ErroDeRegra('Situação inválida.');
    const quando = status === 'paga' ? (pago_em || hoje()) : null;
    await db().run('UPDATE cobrancas SET status = ?, pago_em = ? WHERE id = ?', status, quando, id);
  }
  if (link_pagamento !== undefined) await db().run('UPDATE cobrancas SET link_pagamento = ? WHERE id = ?', linkSeguro(link_pagamento), id);
  await registrar(autorId, 'cobranca.alterada', { id, de: c.status, para: status }, origem);
  return buscarCobranca(id);
}

export function inadimplentes() {
  return db().all(`
    SELECT u.id AS cliente_id, u.nome, u.telefone, u.email,
      COUNT(c.id) AS parcelas_atrasadas, SUM(c.valor_centavos) AS total_centavos, MIN(c.vencimento) AS desde
    FROM cobrancas c JOIN usuarios u ON u.id = c.cliente_id
    WHERE c.status = 'aberta' AND c.vencimento < ?
    GROUP BY u.id ORDER BY total_centavos DESC`, hoje());
}

// ---------------------------------------------------------------- solicitações
export async function criarSolicitacao(clienteId, { area, assunto, descricao }) {
  await exigirCliente(clienteId);
  if (!assunto?.trim() || !descricao?.trim()) throw new ErroDeRegra('Informe o assunto e conte o que precisa.');
  const r = await db().run('INSERT INTO solicitacoes (cliente_id, area, assunto, descricao) VALUES (?, ?, ?, ?)',
    clienteId, area || null, assunto.trim().slice(0, 200), descricao.trim().slice(0, 5000));
  await registrar(clienteId, 'solicitacao.criada', { id: r.id });
  return db().get('SELECT * FROM solicitacoes WHERE id = ?', r.id);
}

export function listarSolicitacoes({ clienteId, status } = {}) {
  const f = [];
  const a = [];
  if (clienteId) { f.push('s.cliente_id = ?'); a.push(clienteId); }
  if (status) { f.push('s.status = ?'); a.push(status); }
  return db().all(`SELECT s.*, u.nome AS cliente_nome FROM solicitacoes s JOIN usuarios u ON u.id = s.cliente_id
    ${f.length ? 'WHERE ' + f.join(' AND ') : ''} ORDER BY s.status = 'nova' DESC, s.criado_em DESC`, ...a);
}

export async function responderSolicitacao(id, { status, resposta }, autorId, origem) {
  const s = await db().get('SELECT * FROM solicitacoes WHERE id = ?', id);
  if (!s) throw new ErroDeRegra('Solicitação não encontrada.', 404);
  if (status && !['nova', 'em_analise', 'aceita', 'recusada', 'concluida'].includes(status)) throw new ErroDeRegra('Situação inválida.');
  await db().run("UPDATE solicitacoes SET status = COALESCE(?, status), resposta = COALESCE(?, resposta), atualizado_em = datetime('now') WHERE id = ?",
    status || null, resposta ?? null, id);
  await registrar(autorId, 'solicitacao.respondida', { id, status }, origem);
  return db().get('SELECT * FROM solicitacoes WHERE id = ?', id);
}

// ---------------------------------------------------------------- painel
export async function painel() {
  const n = async (sql, ...a) => (await db().get(sql, ...a)).n;
  const dia = hoje();
  const [
    clientes_ativos, clientes_novos_30d, processos_ativos, mensagens_nao_lidas, solicitacoes_novas,
    recebido_mes_centavos, a_receber_centavos, em_atraso_centavos, clientes_inadimplentes,
    vencendo_7d, entradas_por_mes, andamentos_recentes,
  ] = await Promise.all([
    n("SELECT COUNT(*) n FROM usuarios WHERE papel='cliente' AND ativo=1"),
    n("SELECT COUNT(*) n FROM usuarios WHERE papel='cliente' AND criado_em >= datetime('now','-30 days')"),
    n("SELECT COUNT(*) n FROM processos WHERE status='ativo'"),
    n('SELECT COUNT(*) n FROM mensagens WHERE do_escritorio=0 AND lida=0'),
    n("SELECT COUNT(*) n FROM solicitacoes WHERE status='nova'"),
    n("SELECT COALESCE(SUM(valor_centavos),0) n FROM cobrancas WHERE status='paga' AND pago_em >= ?", `${dia.slice(0, 8)}01`),
    n("SELECT COALESCE(SUM(valor_centavos),0) n FROM cobrancas WHERE status='aberta' AND vencimento >= ?", dia),
    n("SELECT COALESCE(SUM(valor_centavos),0) n FROM cobrancas WHERE status='aberta' AND vencimento < ?", dia),
    n("SELECT COUNT(DISTINCT cliente_id) n FROM cobrancas WHERE status='aberta' AND vencimento < ?", dia),
    db().all(`SELECT c.id, c.descricao, c.valor_centavos, c.vencimento, u.nome AS cliente_nome, c.cliente_id
      FROM cobrancas c JOIN usuarios u ON u.id=c.cliente_id
      WHERE c.status='aberta' AND c.vencimento BETWEEN ? AND ? ORDER BY c.vencimento LIMIT 10`, dia, hoje(7)),
    db().all(`SELECT strftime('%Y-%m', criado_em) AS mes, COUNT(*) AS n FROM usuarios
      WHERE papel='cliente' AND criado_em >= date('now','start of month','-5 months') GROUP BY mes ORDER BY mes`),
    db().all(`SELECT a.data, a.descricao, a.origem, p.id AS processo_id, p.titulo, u.nome AS cliente_nome
      FROM andamentos a JOIN processos p ON p.id=a.processo_id JOIN usuarios u ON u.id=p.cliente_id
      ORDER BY a.criado_em DESC, a.id DESC LIMIT 8`),
  ]);
  return {
    clientes_ativos, clientes_novos_30d, processos_ativos, mensagens_nao_lidas, solicitacoes_novas,
    recebido_mes_centavos, a_receber_centavos, em_atraso_centavos, clientes_inadimplentes,
    vencendo_7d, entradas_por_mes, andamentos_recentes,
  };
}

// Visão do cliente sobre si mesmo.
export async function inicioDoCliente(clienteId) {
  const [processos, cobrancas, msgs, docs, solicitacoes] = await Promise.all([
    listarProcessos({ clienteId, apenasVisivel: true }),
    listarCobrancas({ clienteId }),
    db().get('SELECT COUNT(*) n FROM mensagens WHERE cliente_id=? AND do_escritorio=1 AND lida=0', clienteId),
    db().get("SELECT COUNT(*) n FROM documentos WHERE cliente_id=? AND status='aguardando_assinatura'", clienteId),
    listarSolicitacoes({ clienteId }),
  ]);
  return {
    processos,
    cobrancas_abertas: cobrancas.filter((c) => c.status === 'aberta'),
    mensagens_nao_lidas: msgs.n,
    documentos_pendentes: docs.n,
    solicitacoes,
  };
}

// ---------------------------------------------------------------- site e visitantes
// De onde a pessoa chegou, pelo endereço da página anterior.
export function fonteDaVisita(referencia, hostDoSite) {
  let host = '';
  try { host = new URL(referencia).hostname.toLowerCase(); } catch { return 'direto'; }
  if (!host || host === hostDoSite || host.endsWith(`.${hostDoSite}`)) return 'direto';
  const fontes = [['google', 'Google'], ['bing', 'Bing'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['fb.', 'Facebook'],
    ['whatsapp', 'WhatsApp'], ['wa.me', 'WhatsApp'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['t.co', 'X/Twitter'], ['x.com', 'X/Twitter']];
  return fontes.find(([trecho]) => host.includes(trecho))?.[1] || 'outros sites';
}

export async function registrarVisita({ pagina, fonte, nova }) {
  const p = String(pagina || '/').split(/[?#]/)[0].toLowerCase();
  if (!/^\/[a-z0-9/_.-]{0,119}$/.test(p)) throw new ErroDeRegra('Página inválida.');
  await db().run(`INSERT INTO visitas (dia, pagina, fonte, vistas, visitantes) VALUES (?, ?, ?, 1, ?)
    ON CONFLICT (dia, pagina, fonte) DO UPDATE SET vistas = vistas + 1, visitantes = visitantes + excluded.visitantes`,
    hoje(), p, String(fonte).slice(0, 30), nova ? 1 : 0);
}

// Painel "Site": visitas, visitantes, páginas, fontes e quantos viraram cadastro.
export async function relatorioSite(dias = 30) {
  const d = Math.min(Math.max(Math.trunc(Number(dias) || 30), 1), 365);
  const desde = hoje(-(d - 1));
  const desdeUtc = inicioDoDiaUtc(desde);
  const [tot, cad, doSite, por_dia, paginas, fontes, cadastros_por_origem, ultimos_cadastros] = await Promise.all([
    db().get('SELECT COALESCE(SUM(vistas),0) vistas, COALESCE(SUM(visitantes),0) visitantes FROM visitas WHERE dia >= ?', desde),
    db().get("SELECT COUNT(*) n FROM usuarios WHERE papel='cliente' AND criado_em >= ?", desdeUtc),
    db().get("SELECT COUNT(*) n FROM usuarios WHERE papel='cliente' AND origem LIKE 'site%' AND criado_em >= ?", desdeUtc),
    db().all('SELECT dia, SUM(vistas) vistas, SUM(visitantes) visitantes FROM visitas WHERE dia >= ? GROUP BY dia ORDER BY dia', desde),
    db().all('SELECT pagina, SUM(vistas) vistas, SUM(visitantes) visitantes FROM visitas WHERE dia >= ? GROUP BY pagina ORDER BY vistas DESC LIMIT 15', desde),
    db().all('SELECT fonte, SUM(visitantes) visitantes, SUM(vistas) vistas FROM visitas WHERE dia >= ? GROUP BY fonte ORDER BY visitantes DESC', desde),
    db().all(`SELECT COALESCE(origem,'app / escritório') origem, COUNT(*) n FROM usuarios
      WHERE papel='cliente' AND criado_em >= ? GROUP BY origem ORDER BY n DESC`, desdeUtc),
    db().all(`SELECT id, nome, area_interesse, origem, criado_em FROM usuarios
      WHERE papel='cliente' ORDER BY criado_em DESC, id DESC LIMIT 10`),
  ]);
  return {
    dias: d,
    vistas: tot.vistas,
    visitantes: tot.visitantes,
    cadastros: cad.n,
    cadastros_do_site: doSite.n,
    conversao: tot.visitantes ? Math.round((doSite.n / tot.visitantes) * 1000) / 10 : 0,
    por_dia, paginas, fontes, cadastros_por_origem, ultimos_cadastros,
  };
}

export function auditoriaRecente(limite = 100) {
  return db().all(`SELECT a.*, u.nome AS usuario_nome FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.id DESC LIMIT ?`, limite);
}
