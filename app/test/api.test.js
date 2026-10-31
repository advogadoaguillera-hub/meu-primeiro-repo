// Testes de ponta a ponta da API: `npm test`.
// Cada execução usa um banco e uma pasta de arquivos temporários.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pasta = mkdtempSync(join(tmpdir(), 'aguillera-teste-'));
process.env.DB_PATH = join(pasta, 'teste.db');
process.env.UPLOADS_DIR = join(pasta, 'arquivos');
delete process.env.ANTHROPIC_API_KEY;
delete process.env.DATAJUD_API_KEY;

const { criarApp } = await import('../server/app.js');
const { criarUsuario } = await import('../server/auth.js');
const { fecharBanco } = await import('../server/db.js');
const { aliasDoTribunal, sincronizarProcesso } = await import('../server/datajud.js');
const { centavos } = await import('../server/nucleo.js');

let servidor;
let base;

// Pequeno cliente HTTP que guarda o cookie de sessão, como um navegador.
function sessao() {
  let cookie = '';
  return async (metodo, caminho, corpo, extra = {}) => {
    const headers = { 'X-Aguillera': '1', ...(cookie ? { Cookie: cookie } : {}), ...extra.headers };
    let body;
    if (corpo instanceof FormData) body = corpo;
    else if (corpo !== undefined) { body = JSON.stringify(corpo); headers['Content-Type'] = 'application/json'; }
    const resp = await fetch(base + caminho, { method: metodo, headers, body });
    const sc = resp.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const tipo = resp.headers.get('content-type') || '';
    return { status: resp.status, dados: tipo.includes('json') ? await resp.json() : await resp.text() };
  };
}

const gestor = sessao();
const estagiario = sessao();
const maria = sessao();
const joao = sessao();
const ids = {};

before(async () => {
  criarUsuario({ nome: 'Jocsan Aguillera', email: 'gestor@teste.br', senha: 'senha-forte-1', papel: 'gestor' });
  servidor = criarApp().listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor?.close();
  fecharBanco();
  rmSync(pasta, { recursive: true, force: true });
});

test('marca e recursos são públicos', async () => {
  const r = await sessao()('GET', '/api/marca');
  assert.equal(r.status, 200);
  assert.equal(r.dados.marca.nome, 'Aguillera');
  assert.deepEqual(r.dados.recursos, { claude: false, datajud: false });
});

test('escrita sem o cabeçalho do app é recusada (CSRF)', async () => {
  const r = await fetch(base + '/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
});

test('login: senha errada e certa', async () => {
  assert.equal((await gestor('POST', '/api/entrar', { email: 'gestor@teste.br', senha: 'errada123' })).status, 401);
  const r = await gestor('POST', '/api/entrar', { email: 'GESTOR@teste.br', senha: 'senha-forte-1' });
  assert.equal(r.status, 200);
  assert.equal(r.dados.usuario.papel, 'gestor');
  assert.equal(r.dados.usuario.senha_hash, undefined, 'hash da senha nunca sai do servidor');
});

test('cadastro do cliente exige consentimento LGPD e cria sessão', async () => {
  const semConsent = await maria('POST', '/api/cadastro', { nome: 'Maria Souza', email: 'maria@teste.br', senha: '12345678' });
  assert.equal(semConsent.status, 400);
  const r = await maria('POST', '/api/cadastro', {
    nome: 'Maria Souza', email: 'maria@teste.br', senha: '12345678', telefone: '67999990000', area_interesse: 'previdenciario', consentimento: true,
  });
  assert.equal(r.status, 201);
  ids.maria = r.dados.usuario.id;
  assert.equal(r.dados.usuario.papel, 'cliente');
  const dup = await sessao()('POST', '/api/cadastro', { nome: 'X', email: 'maria@teste.br', senha: '12345678', consentimento: true });
  assert.equal(dup.status, 409);

  const j = await joao('POST', '/api/cadastro', { nome: 'João Lima', email: 'joao@teste.br', senha: '12345678', consentimento: true });
  ids.joao = j.dados.usuario.id;
});

test('somente o gestor cadastra estagiário', async () => {
  const r = await gestor('POST', '/api/escritorio/gestor/equipe', { nome: 'Ana Estagiária', email: 'ana@teste.br', senha: 'estagio-123' });
  assert.equal(r.status, 201);
  ids.ana = r.dados.id;
  assert.equal((await estagiario('POST', '/api/entrar', { email: 'ana@teste.br', senha: 'estagio-123' })).status, 200);
  assert.equal((await estagiario('POST', '/api/escritorio/gestor/equipe', { nome: 'Y', email: 'y@teste.br', senha: '12345678' })).status, 403);
  assert.equal((await gestor('POST', '/api/escritorio/gestor/equipe', { nome: 'Z', email: 'z@teste.br', senha: '12345678', papel: 'gestor' })).dados.papel, 'equipe',
    'não dá para criar um segundo gestor por esta rota');
});

test('cliente não acessa a área do escritório', async () => {
  assert.equal((await maria('GET', '/api/escritorio/painel')).status, 403);
  assert.equal((await maria('GET', '/api/escritorio/clientes')).status, 403);
  assert.equal((await sessao()('GET', '/api/escritorio/painel')).status, 401);
});

test('processo, andamento visível e nota interna', async () => {
  const p = await estagiario('POST', '/api/escritorio/processos', {
    cliente_id: ids.maria, titulo: 'Aposentadoria por idade rural', area: 'previdenciario', numero_cnj: '0001234-56.2025.8.12.0008',
  });
  assert.equal(p.status, 201);
  assert.equal(p.dados.numero_cnj, '0001234-56.2025.8.12.0008');
  ids.processo = p.dados.id;

  assert.equal((await estagiario('POST', '/api/escritorio/processos', { cliente_id: ids.maria, titulo: 'X', numero_cnj: '123' })).status, 400);

  await estagiario('POST', `/api/escritorio/processos/${ids.processo}/andamentos`, { data: '2026-10-01', descricao: 'Petição inicial protocolada', explicacao: 'Seu pedido foi apresentado à Justiça.' });
  await estagiario('POST', `/api/escritorio/processos/${ids.processo}/andamentos`, { data: '2026-10-02', descricao: 'Nota: cliente precisa trazer CNIS', visivel_cliente: false });
  const dup = await estagiario('POST', `/api/escritorio/processos/${ids.processo}/andamentos`, { data: '2026-10-01', descricao: 'Petição inicial protocolada' });
  assert.equal(dup.status, 409);

  const visto = await maria('GET', `/api/cliente/processos/${ids.processo}`);
  assert.equal(visto.status, 200);
  assert.equal(visto.dados.andamentos.length, 1, 'cliente não vê nota interna');
  assert.equal(visto.dados.andamentos[0].explicacao, 'Seu pedido foi apresentado à Justiça.');

  const interno = await gestor('GET', `/api/escritorio/processos/${ids.processo}`);
  assert.equal(interno.dados.andamentos.length, 2);
});

test('cliente não vê processo de outro cliente', async () => {
  assert.equal((await joao('GET', `/api/cliente/processos/${ids.processo}`)).status, 404);
  assert.equal((await joao('GET', '/api/cliente/processos')).dados.length, 0);
});

test('mensagens nos dois sentidos com leitura', async () => {
  assert.equal((await maria('POST', '/api/cliente/mensagens', { texto: 'Bom dia, tem novidade?' })).status, 201);
  let caixa = await gestor('GET', '/api/escritorio/mensagens');
  assert.equal(caixa.dados[0].nao_lidas, 1);
  await gestor('GET', `/api/escritorio/mensagens/${ids.maria}`);
  caixa = await gestor('GET', '/api/escritorio/mensagens');
  assert.equal(caixa.dados[0].nao_lidas, 0);

  await estagiario('POST', `/api/escritorio/mensagens/${ids.maria}`, { texto: 'Bom dia, Maria! A petição foi protocolada.' });
  assert.equal((await maria('GET', '/api/cliente/inicio')).dados.mensagens_nao_lidas, 1);
  const conversa = await maria('GET', '/api/cliente/mensagens');
  assert.equal(conversa.dados.length, 2);
  assert.equal((await maria('GET', '/api/cliente/inicio')).dados.mensagens_nao_lidas, 0);
  assert.equal((await maria('POST', '/api/cliente/mensagens', { texto: '   ' })).status, 400);
});

test('cobranças, parcelamento, atraso e pagamento', async () => {
  const r = await gestor('POST', '/api/escritorio/cobrancas', {
    cliente_id: ids.maria, descricao: 'Honorários contratuais', valor: '1.000,00', vencimento: '2026-01-31', parcelas: 3,
  });
  assert.equal(r.status, 201);
  assert.deepEqual(r.dados.map((c) => c.vencimento), ['2026-01-31', '2026-02-28', '2026-03-31'], 'último dia do mês quando o dia não existe');
  assert.equal(r.dados.reduce((s, c) => s + c.valor_centavos, 0), 100000, 'soma das parcelas fecha o total');
  assert.equal(r.dados[0].valor_centavos, 33334);

  const inad = await gestor('GET', '/api/escritorio/inadimplentes');
  assert.equal(inad.dados.length, 1);
  assert.equal(inad.dados[0].parcelas_atrasadas, 3);

  await gestor('PATCH', `/api/escritorio/cobrancas/${r.dados[0].id}`, { status: 'paga' });
  const lista = await maria('GET', '/api/cliente/cobrancas');
  assert.equal(lista.dados.find((c) => c.id === r.dados[0].id).situacao, 'paga');
  assert.equal(lista.dados.filter((c) => c.situacao === 'atrasada').length, 2);

  const filtro = await gestor('GET', '/api/escritorio/clientes?situacao=inadimplentes');
  assert.deepEqual(filtro.dados.map((c) => c.id), [ids.maria]);

  assert.equal((await gestor('POST', '/api/escritorio/cobrancas', { cliente_id: ids.maria, descricao: 'x', valor: '-5', vencimento: '2026-01-01' })).status, 400);
  assert.equal((await joao('GET', '/api/cliente/cobrancas')).dados.length, 0);
});

test('documentos: escritório envia contrato, cliente baixa; outro cliente não', async () => {
  const fd = new FormData();
  fd.append('tipo', 'contrato');
  fd.append('titulo', 'Contrato de honorários');
  fd.append('status', 'aguardando_assinatura');
  fd.append('arquivo', new Blob(['%PDF-1.4 teste'], { type: 'application/pdf' }), 'contrato.pdf');
  const r = await gestor('POST', `/api/escritorio/clientes/${ids.maria}/documentos`, fd);
  assert.equal(r.status, 201);
  ids.doc = r.dados.id;

  assert.equal((await maria('GET', '/api/cliente/inicio')).dados.documentos_pendentes, 1);
  const baixa = await maria('GET', `/api/documentos/${ids.doc}/arquivo`);
  assert.equal(baixa.status, 200);
  assert.match(baixa.dados, /%PDF/);
  assert.equal((await joao('GET', `/api/documentos/${ids.doc}/arquivo`)).status, 404);

  const ruim = new FormData();
  ruim.append('arquivo', new Blob(['MZ'], { type: 'application/x-msdownload' }), 'virus.exe');
  assert.equal((await maria('POST', '/api/cliente/documentos', ruim)).status, 400);

  const rg = new FormData();
  rg.append('tipo', 'documento_pessoal');
  rg.append('arquivo', new Blob(['img'], { type: 'image/png' }), 'rg.png');
  assert.equal((await maria('POST', '/api/cliente/documentos', rg)).status, 201);
  assert.equal((await maria('GET', '/api/cliente/documentos')).dados.length, 2);
});

test('solicitação de serviço pelo cliente e resposta do escritório', async () => {
  const s = await joao('POST', '/api/cliente/solicitacoes', { area: 'civel', assunto: 'Atraso na entrega do apartamento', descricao: 'A construtora atrasou 8 meses.' });
  assert.equal(s.status, 201);
  assert.equal((await gestor('GET', '/api/escritorio/painel')).dados.solicitacoes_novas, 1);
  await estagiario('PATCH', `/api/escritorio/solicitacoes/${s.dados.id}`, { status: 'em_analise', resposta: 'Recebemos. Vamos analisar os documentos.' });
  const minhas = await joao('GET', '/api/cliente/solicitacoes');
  assert.equal(minhas.dados[0].status, 'em_analise');
  assert.equal(minhas.dados[0].resposta, 'Recebemos. Vamos analisar os documentos.');
});

test('gestor revoga e devolve acesso; estagiário não pode', async () => {
  assert.equal((await estagiario('POST', `/api/escritorio/gestor/acesso/${ids.joao}`, { ativo: false })).status, 403);
  assert.equal((await gestor('POST', `/api/escritorio/gestor/acesso/${ids.joao}`, { ativo: false })).status, 200);
  assert.equal((await joao('GET', '/api/cliente/inicio')).status, 401, 'sessão encerrada na hora');
  assert.equal((await joao('POST', '/api/entrar', { email: 'joao@teste.br', senha: '12345678' })).status, 403);
  await gestor('POST', `/api/escritorio/gestor/acesso/${ids.joao}`, { ativo: true });
  assert.equal((await joao('POST', '/api/entrar', { email: 'joao@teste.br', senha: '12345678' })).status, 200);
  const gid = (await gestor('GET', '/api/eu')).dados.usuario.id;
  assert.equal((await gestor('POST', `/api/escritorio/gestor/acesso/${gid}`, { ativo: false })).status, 403, 'gestor não se desliga');
});

test('painel consolida os números', async () => {
  const p = (await gestor('GET', '/api/escritorio/painel')).dados;
  assert.equal(p.clientes_ativos, 2);
  assert.equal(p.processos_ativos, 1);
  assert.equal(p.clientes_inadimplentes, 1);
  assert.equal(p.em_atraso_centavos, 66666);
  assert.ok(p.andamentos_recentes.length >= 2);
});

test('auditoria registra as ações', async () => {
  const a = await gestor('GET', '/api/escritorio/gestor/auditoria');
  const acoes = a.dados.map((x) => x.acao);
  for (const esperado of ['processo.criado', 'cobranca.criada', 'acesso.revogado', 'documento.enviado']) assert.ok(acoes.includes(esperado), esperado);
});

test('troca de senha', async () => {
  assert.equal((await maria('POST', '/api/eu/senha', { atual: 'errada', nova: 'nova-senha-1' })).status, 403);
  assert.equal((await maria('POST', '/api/eu/senha', { atual: '12345678', nova: 'nova-senha-1' })).status, 200);
  assert.equal((await sessao()('POST', '/api/entrar', { email: 'maria@teste.br', senha: 'nova-senha-1' })).status, 200);
});

test('assistente Claude sem chave responde de forma clara', async () => {
  const r = await gestor('POST', '/api/escritorio/assistente', { historico: [{ papel: 'usuario', texto: 'Quem está inadimplente?' }] });
  assert.equal(r.status, 503);
  assert.match(r.dados.erro, /ANTHROPIC_API_KEY/);
});

test('DataJud: tribunal pelo número CNJ e importação de movimentos', async () => {
  assert.equal(aliasDoTribunal('0001234-56.2025.8.12.0008'), 'tjms');
  assert.equal(aliasDoTribunal('0001234-56.2025.4.03.6000'), 'trf3');
  assert.equal(aliasDoTribunal('0001234-56.2025.5.24.0001'), 'trt24');
  assert.equal(aliasDoTribunal('123'), null);

  process.env.DATAJUD_API_KEY = 'chave-de-teste';
  let urlChamada;
  const fetchFalso = async (url, opts) => {
    urlChamada = url;
    assert.equal(opts.headers.Authorization, 'APIKey chave-de-teste');
    return new Response(JSON.stringify({ hits: { hits: [{ _source: { movimentos: [
      { nome: 'Conclusão', dataHora: '2026-10-10T10:00:00.000Z' },
      { nome: 'Decisão', dataHora: '2026-10-15T12:00:00.000Z', complementosTabelados: [{ nome: 'tutela deferida' }] },
    ] } }] } }), { headers: { 'Content-Type': 'application/json' } });
  };
  assert.deepEqual(await sincronizarProcesso(ids.processo, { fetchFn: fetchFalso }), { novos: 2 });
  assert.match(urlChamada, /api_publica_tjms\/_search$/);
  assert.deepEqual(await sincronizarProcesso(ids.processo, { fetchFn: fetchFalso }), { novos: 0 }, 'não duplica');
  delete process.env.DATAJUD_API_KEY;

  const visto = await maria('GET', `/api/cliente/processos/${ids.processo}`);
  assert.ok(visto.dados.andamentos.some((a) => a.descricao === 'Decisão (tutela deferida)' && a.origem === 'datajud'));
});

test('conversão de valores em reais', () => {
  assert.equal(centavos('1.234,56'), 123456);
  assert.equal(centavos('1500'), 150000);
  assert.equal(centavos('R$ 99,90'), 9990);
  assert.equal(centavos(10.5), 1050);
  assert.throws(() => centavos('abc'));
});

test('telas: qualquer rota fora da API devolve o aplicativo', async () => {
  const r = await fetch(base + '/painel');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<html/);
  assert.equal((await fetch(base + '/api/nao-existe')).status, 401, 'rotas desconhecidas da API exigem login');
});
