// Andamento automático: consulta a API Pública do DataJud (CNJ).
// Documentação oficial: https://datajud-wiki.cnj.jus.br/api-publica/
// A chave pública é divulgada pelo CNJ nessa página e muda de tempos em tempos;
// coloque-a em DATAJUD_API_KEY (no .env ou nos segredos do Cloudflare).
//
// Cada movimento novo vira um andamento do processo, visível ao cliente.
// Movimentos repetidos são ignorados (mesma data + mesma descrição).

import { db } from './banco.js';
import { registrarAndamento, registrar } from './nucleo.js';
import { variavel } from './ambiente.js';

const BASE = 'https://api-publica.datajud.cnj.jus.br';

// Código TR (2 dígitos) → sigla do Tribunal de Justiça estadual.
const UF_ESTADUAL = {
  '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba', '06': 'tjce', '07': 'tjdft',
  '08': 'tjes', '09': 'tjgo', '10': 'tjma', '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa',
  '15': 'tjpb', '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn', '21': 'tjrs',
  '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse', '26': 'tjsp', '27': 'tjto',
};

// Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO — J = segmento da Justiça, TR = tribunal.
export function aliasDoTribunal(numeroCnj) {
  const d = String(numeroCnj || '').replace(/\D/g, '');
  if (d.length !== 20) return null;
  const j = d[13];
  const tr = d.slice(14, 16);
  if (j === '3') return 'stj';
  if (j === '4') return `trf${Number(tr)}`;
  if (j === '5') return `trt${Number(tr)}`;
  if (j === '8') return UF_ESTADUAL[tr] || null;
  return null;
}

export const datajudConfigurado = () => Boolean(variavel('DATAJUD_API_KEY'));

export async function consultarMovimentos(numeroCnj, { fetchFn = fetch } = {}) {
  const alias = aliasDoTribunal(numeroCnj);
  if (!alias) throw new Error('Tribunal não suportado para consulta automática.');
  const resp = await fetchFn(`${BASE}/api_publica_${alias}/_search`, {
    method: 'POST',
    headers: { Authorization: `APIKey ${variavel('DATAJUD_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { match: { numeroProcesso: String(numeroCnj).replace(/\D/g, '') } } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`DataJud respondeu ${resp.status}.`);
  const json = await resp.json();
  const movimentos = [];
  for (const hit of json?.hits?.hits || []) {
    for (const m of hit._source?.movimentos || []) {
      if (!m?.nome || !m?.dataHora) continue;
      const complementos = (m.complementosTabelados || []).map((c) => c.nome || c.descricao).filter(Boolean);
      movimentos.push({
        data: String(m.dataHora).slice(0, 10),
        descricao: complementos.length ? `${m.nome} (${complementos.join(', ')})` : m.nome,
      });
    }
  }
  return movimentos;
}

export async function sincronizarProcesso(processoId, opcoes) {
  const p = await db().get('SELECT id, numero_cnj FROM processos WHERE id = ?', processoId);
  if (!p?.numero_cnj) return { novos: 0, motivo: 'Processo sem número CNJ.' };
  const movimentos = await consultarMovimentos(p.numero_cnj, opcoes);
  let novos = 0;
  for (const m of movimentos) {
    if ((await registrarAndamento(p.id, { ...m, origem: 'datajud' }, null)).inserido) novos += 1;
  }
  await db().run("UPDATE processos SET sincronizado_em = datetime('now') WHERE id = ?", p.id);
  return { novos };
}

export async function sincronizarTodos(opcoes) {
  if (!datajudConfigurado()) return { processos: 0, novos: 0, erros: [] };
  const ids = await db().all(
    "SELECT id FROM processos WHERE status = 'ativo' AND sincronizar = 1 AND numero_cnj IS NOT NULL");
  let novos = 0;
  const erros = [];
  for (const { id } of ids) {
    try {
      novos += (await sincronizarProcesso(id, opcoes)).novos;
    } catch (e) {
      erros.push({ processo_id: id, erro: e.message });
    }
  }
  await registrar(null, 'datajud.sincronizacao', { processos: ids.length, novos, erros: erros.length }, 'automacao');
  return { processos: ids.length, novos, erros };
}
