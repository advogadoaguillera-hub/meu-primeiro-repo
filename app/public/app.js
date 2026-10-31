// Aguillera — aplicativo do escritório (portal do cliente + gestão interna).
// JavaScript puro, sem framework e sem etapa de compilação.

// ====================================================================== utilidades
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const reais = (centavos) => (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};
const quando = (iso) => {
  if (!iso) return '';
  if (String(iso).length <= 10) return dataBr(iso);
  const dt = new Date(String(iso).replace(' ', 'T') + (String(iso).length <= 19 && !String(iso).endsWith('Z') ? 'Z' : ''));
  const hojeStr = new Date().toDateString();
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return dt.toDateString() === hojeStr ? `hoje, ${hora}` : `${dt.toLocaleDateString('pt-BR')} ${hora}`;
};
const hojeIso = () => new Date().toISOString().slice(0, 10);
const primeiroNome = (nome) => String(nome || '').split(' ')[0];

class ErroApi extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

async function api(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: { 'X-Aguillera': '1' }, credentials: 'same-origin' };
  if (corpo instanceof FormData) opcoes.body = corpo;
  else if (corpo !== undefined) { opcoes.body = JSON.stringify(corpo); opcoes.headers['Content-Type'] = 'application/json'; }
  let resp;
  try {
    resp = await fetch('/api' + caminho, opcoes);
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Verifique a internet.', 0);
  }
  const dados = (resp.headers.get('content-type') || '').includes('json') ? await resp.json() : null;
  if (!resp.ok) {
    if (resp.status === 401 && estado.usuario && caminho !== '/entrar') { estado.usuario = null; navegar('#/entrar'); }
    throw new ErroApi(dados?.erro || 'Não foi possível concluir.', resp.status);
  }
  return dados;
}

function avisar(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `aviso ${tipo === 'erro' ? 'erro' : ''}`;
  el.textContent = texto;
  $('#avisos').append(el);
  setTimeout(() => el.remove(), 4200);
}

// Abre a janela modal com um formulário; `aoEnviar` recebe os dados e fecha se der certo.
function abrirModal(titulo, html, aoEnviar) {
  const dlg = $('#modal');
  $('#modal-titulo').textContent = titulo;
  $('#modal-corpo').innerHTML = html;
  const form = $('form', dlg);
  if (form && aoEnviar) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const botao = $('button[type=submit]', form);
      botao.disabled = true;
      $('.erro-form', form)?.remove();
      try {
        await aoEnviar(form, Object.fromEntries(new FormData(form)));
        dlg.close();
      } catch (err) {
        form.insertAdjacentHTML('afterbegin', `<div class="erro-form">${e(err.message)}</div>`);
      } finally {
        botao.disabled = false;
      }
    });
  }
  dlg.showModal();
  $('input, select, textarea', dlg)?.focus();
  return dlg;
}
document.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-fechar]')) $('#modal').close();
});

// Formulário comum na página (fora de modal).
function aoEnviar(form, fn) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = $('button[type=submit]', form);
    if (botao) botao.disabled = true;
    $('.erro-form', form)?.remove();
    try {
      await fn(Object.fromEntries(new FormData(form)), form);
    } catch (err) {
      form.insertAdjacentHTML('afterbegin', `<div class="erro-form">${e(err.message)}</div>`);
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}

// Texto do Claude → HTML seguro (negrito, listas, parágrafos).
function textoRico(t) {
  const blocos = e(t).split(/\n{2,}/);
  return blocos.map((b) => {
    const linhas = b.split('\n');
    const negrito = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (linhas.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
      return `<ul>${linhas.map((l) => `<li>${negrito(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${negrito(linhas.join('<br>'))}</p>`;
  }).join('');
}

// ====================================================================== ícones (traço)
const I = {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  processo: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  mensagem: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>',
  documento: '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
  pagamento: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  servico: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>',
  escritorio: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18"/>',
  painel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  financeiro: '<path d="M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2 2.8 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.1-5-3"/>',
  solicitacao: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',
  equipe: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="m16.5 3.5 1.5 1.5 3-3"/>',
  claude: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  enviar: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  baixar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  voltar: '<path d="M15 18l-6-6 6-6"/>',
  whatsapp: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z"/>',
  sincronizar: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5"/>',
};
const icone = (nome) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[nome] || ''}</svg>`;

let seloN = 0;
// Cada selo precisa de um id de gradiente próprio (o do topo do celular fica oculto no desktop).
const seloSvg = () => {
  const g = `og${++seloN}`;
  return `<svg class="marca-selo" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7D08A"/><stop offset=".45" stop-color="#C8A84E"/><stop offset="1" stop-color="#9C7C2E"/></linearGradient></defs><rect width="64" height="64" rx="12" fill="#06281F" stroke="rgba(200,168,78,.45)"/><g transform="translate(3.5 8) scale(.95)"><path d="M23.5 6h8.5v27.5c0 7.2-4.1 11.6-11 11.6-4.6 0-8.2-1.9-10.4-5.2l5.2-4.6c1.2 1.9 2.9 3 5 3 2.4 0 3.7-1.5 3.7-4.6z" fill="url(#${g})"/><path d="M38.5 6h7.6L59 45.6h-8.4l-2.3-7.7H37.9l-2.3 7.7h-8.3zM40 31.2h6.4l-3.2-11.8z" fill="url(#${g})"/></g></svg>`;
};
const marcaHtml = (sub) => `<span class="marca">${seloSvg()}<span><span class="marca-nome">${e(estado.marca?.marca?.nome || 'Aguillera')}</span>${sub ? `<span class="marca-sub">${e(sub)}</span>` : ''}</span></span>`;

// ====================================================================== rótulos
const SITUACAO_COBRANCA = { a_vencer: ['A vencer', 'alerta'], atrasada: ['Atrasada', 'perigo'], paga: ['Paga', 'ok'], cancelada: ['Cancelada', ''] };
const STATUS_PROCESSO = { ativo: ['Em andamento', 'verde'], suspenso: ['Suspenso', 'alerta'], arquivado: ['Arquivado', ''], encerrado: ['Encerrado', ''] };
const STATUS_SOLICITACAO = { nova: ['Nova', 'ouro'], em_analise: ['Em análise', 'alerta'], aceita: ['Aceita', 'ok'], recusada: ['Não atendida', ''], concluida: ['Concluída', 'verde'] };
const STATUS_DOC = { disponivel: ['Disponível', 'verde'], aguardando_assinatura: ['Aguardando assinatura', 'alerta'], assinado: ['Assinado', 'ok'] };
const TIPOS_DOC = { contrato: 'Contrato de honorários', procuracao: 'Procuração', declaracao: 'Declaração', comprovante: 'Comprovante', documento_pessoal: 'Documento pessoal', peca: 'Peça processual', outro: 'Outro' };
const selo = (mapa, chave) => {
  const [txt, cls] = mapa[chave] || [chave, ''];
  return `<span class="selo ${cls}">${e(txt)}</span>`;
};
const nomeArea = (id) => estado.marca?.areas?.find((a) => a.id === id)?.nome || id || '—';
const opcoesAreas = (sel) => `<option value="">— escolha —</option>` + (estado.marca?.areas || []).map((a) => `<option value="${e(a.id)}" ${a.id === sel ? 'selected' : ''}>${e(a.nome)}</option>`).join('');

// ====================================================================== estado e rotas
const estado = { usuario: null, marca: null, limpeza: [] };
const ehEscritorio = () => ['gestor', 'equipe'].includes(estado.usuario?.papel);
const ehGestor = () => estado.usuario?.papel === 'gestor';

const MENU_CLIENTE = [
  ['#/inicio', 'Início', 'inicio'],
  ['#/processos', 'Processos', 'processo'],
  ['#/mensagens', 'Mensagens', 'mensagem'],
  ['#/documentos', 'Documentos', 'documento'],
  ['#/pagamentos', 'Pagamentos', 'pagamento'],
  ['#/servicos', 'Serviços', 'servico'],
  ['#/escritorio', 'Escritório', 'escritorio'],
];
const MENU_ESCRITORIO = [
  ['#/painel', 'Painel', 'painel'],
  ['#/clientes', 'Clientes', 'clientes'],
  ['#/processos', 'Processos', 'processo'],
  ['#/mensagens', 'Mensagens', 'mensagem'],
  ['#/financeiro', 'Financeiro', 'financeiro'],
  ['#/solicitacoes', 'Solicitações', 'solicitacao'],
  ['#/assistente', 'Claude', 'claude'],
];

const navegar = (hash) => { if (location.hash === hash) rotear(); else location.hash = hash; };
window.addEventListener('hashchange', () => rotear());

function limpar() {
  estado.limpeza.forEach((fn) => fn());
  estado.limpeza = [];
}

async function rotear() {
  limpar();
  const [, rota = '', param] = (location.hash || '#/').split('/');
  if (!estado.usuario) {
    return rota === 'cadastro' ? telaCadastro() : telaEntrar();
  }
  if (rota === 'entrar' || rota === 'cadastro' || !rota) return navegar(ehEscritorio() ? '#/painel' : '#/inicio');

  const telas = ehEscritorio()
    ? { painel: escPainel, clientes: escClientes, cliente: escCliente, processos: escProcessos, processo: escProcesso, mensagens: escMensagens,
      financeiro: escFinanceiro, solicitacoes: escSolicitacoes, equipe: escEquipe, assistente: escAssistente, perfil: telaPerfil }
    : { inicio: cliInicio, processos: cliProcessos, processo: cliProcesso, mensagens: cliMensagens, documentos: cliDocumentos,
      pagamentos: cliPagamentos, servicos: cliServicos, escritorio: cliEscritorio, perfil: telaPerfil };
  const tela = telas[rota];
  if (!tela) return navegar(ehEscritorio() ? '#/painel' : '#/inicio');

  const conteudo = casca(rota);
  conteudo.innerHTML = '<div class="carregando">Carregando…</div>';
  try {
    await tela(conteudo, param);
  } catch (err) {
    if (err.status === 401) return;
    conteudo.innerHTML = `<div class="cartao vazio"><h3>Não foi possível abrir esta página</h3><p>${e(err.message)}</p>
      <button class="botao claro" type="button" id="tentar">Tentar de novo</button></div>`;
    $('#tentar', conteudo).addEventListener('click', () => rotear());
  }
  window.scrollTo(0, 0);
}

// Estrutura com menu lateral (desktop) ou barra inferior (celular).
function casca(rotaAtual) {
  const menu = [...(ehEscritorio() ? MENU_ESCRITORIO : MENU_CLIENTE)];
  if (ehGestor()) menu.push(['#/equipe', 'Equipe', 'equipe']);
  const ativa = { cliente: 'clientes', processo: 'processos' }[rotaAtual] || rotaAtual;
  const u = estado.usuario;
  const papel = { gestor: 'Gestor', equipe: 'Equipe', cliente: 'Cliente' }[u.papel];
  $('#app').innerHTML = `
    <header class="topo-movel">${marcaHtml()}<a class="perfil" href="#/perfil">${e(primeiroNome(u.nome))}</a></header>
    <div class="casca">
      <nav class="lateral" aria-label="Menu principal">
        <a href="${ehEscritorio() ? '#/painel' : '#/inicio'}" class="marca-link">${marcaHtml(ehEscritorio() ? 'Escritório' : 'Portal do cliente')}</a>
        <ul class="menu">
          ${menu.map(([href, rotulo, ic]) => `<li><a href="${href}" ${href === '#/' + ativa ? 'aria-current="page"' : ''} data-menu="${href.slice(2)}">${icone(ic)}<span>${rotulo}</span></a></li>`).join('')}
        </ul>
        <div class="lateral-pe"><a href="#/perfil" class="marca-link"><strong>${e(u.nome)}</strong><span>${papel} · minha conta</span></a></div>
      </nav>
      <main class="principal" id="conteudo" tabindex="-1"></main>
    </div>`;
  atualizarContadores();
  return $('#conteudo');
}

async function atualizarContadores() {
  try {
    if (ehEscritorio()) {
      const p = await api('GET', '/escritorio/painel');
      contador('mensagens', p.mensagens_nao_lidas);
      contador('solicitacoes', p.solicitacoes_novas);
    } else {
      const i = await api('GET', '/cliente/inicio');
      contador('mensagens', i.mensagens_nao_lidas);
      contador('documentos', i.documentos_pendentes);
    }
  } catch { /* contador é cosmético */ }
}
function contador(rota, n) {
  const a = $(`[data-menu="${rota}"]`);
  if (!a) return;
  $('.contador', a)?.remove();
  if (n > 0) a.insertAdjacentHTML('beforeend', `<span class="contador" aria-label="${n} pendentes">${n}</span>`);
}

const cabecalho = (rotulo, titulo, sub = '', acoes = '') => `
  <div class="cabecalho"><div><div class="rotulo">${e(rotulo)}</div><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${acoes ? `<div class="acoes">${acoes}</div>` : ''}</div>`;
const vazio = (titulo, texto = '') => `<div class="vazio"><h3>${e(titulo)}</h3>${texto ? `<p>${texto}</p>` : ''}</div>`;

// ====================================================================== acesso
function telaAcesso(formHtml) {
  const m = estado.marca;
  $('#app').innerHTML = `
    <div class="acesso">
      <section class="acesso-arte">
        <div>${marcaHtml(m?.advogado?.oab)}
          <h1>Seu caso, <em>acompanhado</em> de perto.</h1>
          <p>${e(m?.marca?.assinatura || '')} Tudo o que o escritório faz por você, reunido em um só lugar.</p>
          <ul class="acesso-lista">
            <li>Andamento dos processos atualizado automaticamente</li>
            <li>Conversa direta com o escritório</li>
            <li>Contrato, procuração e documentos sempre à mão</li>
            <li>Pagamentos e vencimentos com clareza</li>
          </ul>
        </div>
        <div class="acesso-rodape">${e(m?.marca?.nomeCompleto || '')} · ${e(m?.contato?.endereco || '')}</div>
      </section>
      <section class="acesso-form"><div class="acesso-caixa">${formHtml}</div></section>
    </div>`;
}

function telaEntrar() {
  telaAcesso(`
    <h2>Entrar</h2><p class="sub">Use o e-mail e a senha do seu cadastro.</p>
    <form id="f-entrar" novalidate>
      <div class="campo"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="campo"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="current-password" required></div>
      <button class="botao largo" type="submit">Entrar</button>
    </form>
    <p class="alternar">Ainda não tem conta? <a href="#/cadastro">Cadastre-se</a></p>
    <p class="alternar pequeno">Esqueceu a senha? Fale com o escritório${estado.marca?.contato?.whatsapp ? ` pelo <a href="https://wa.me/${e(estado.marca.contato.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}.</p>`);
  aoEnviar($('#f-entrar'), async (d) => {
    estado.usuario = (await api('POST', '/entrar', d)).usuario;
    navegar(ehEscritorio() ? '#/painel' : '#/inicio');
  });
  $('#email').focus();
}

function telaCadastro() {
  telaAcesso(`
    <h2>Criar sua conta</h2><p class="sub">Leva um minuto. O escritório recebe o seu cadastro na hora.</p>
    <form id="f-cadastro" novalidate>
      <div class="campo"><label for="nome">Nome completo</label><input id="nome" name="nome" type="text" autocomplete="name" required></div>
      <div class="linha-campos">
        <div class="campo"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required></div>
        <div class="campo"><label for="telefone">Celular / WhatsApp</label><input id="telefone" name="telefone" type="tel" autocomplete="tel"></div>
      </div>
      <div class="linha-campos">
        <div class="campo"><label for="cpf">CPF</label><input id="cpf" name="cpf" type="text" inputmode="numeric"></div>
        <div class="campo"><label for="area">Assunto de interesse</label><select id="area" name="area_interesse">${opcoesAreas()}</select></div>
      </div>
      <div class="campo"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="new-password" minlength="8" required><small>Pelo menos 8 caracteres.</small></div>
      <label class="caixa-marcar"><input type="checkbox" name="consentimento" value="1" required>
        <span>Autorizo o escritório a tratar meus dados pessoais para prestar o atendimento jurídico, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</span></label>
      <button class="botao largo" type="submit">Criar conta</button>
    </form>
    <p class="alternar">Já tem conta? <a href="#/entrar">Entrar</a></p>`);
  aoEnviar($('#f-cadastro'), async (d) => {
    estado.usuario = (await api('POST', '/cadastro', { ...d, consentimento: Boolean(d.consentimento) })).usuario;
    avisar('Conta criada. Bem-vindo(a)!');
    navegar('#/inicio');
  });
}

// ====================================================================== perfil (todos)
async function telaPerfil(c) {
  const { usuario: u } = await api('GET', '/eu');
  c.innerHTML = `${cabecalho('Minha conta', e(u.nome), e(u.email))}
    <div class="grade grade-2">
      <form class="cartao" id="f-perfil"><h3>Dados de contato</h3><br>
        <div class="campo"><label>Nome</label><input name="nome" type="text" value="${e(u.nome)}" required></div>
        <div class="campo"><label>Telefone</label><input name="telefone" type="tel" value="${e(u.telefone || '')}"></div>
        ${u.papel === 'cliente' ? `<div class="campo"><label>Endereço</label><input name="endereco" type="text" value="${e(u.endereco || '')}"></div>` : ''}
        <button class="botao" type="submit">Salvar</button>
      </form>
      <form class="cartao" id="f-senha"><h3>Trocar senha</h3><br>
        <div class="campo"><label>Senha atual</label><input name="atual" type="password" autocomplete="current-password" required></div>
        <div class="campo"><label>Nova senha</label><input name="nova" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="botao" type="submit">Trocar senha</button>
      </form>
    </div>
    <div class="cartao"><div class="acoes"><button class="botao perigo" type="button" id="sair">Sair da conta</button>
      <span class="suave pequeno">Conta criada em ${dataBr(u.criado_em)}.</span></div></div>`;
  aoEnviar($('#f-perfil', c), async (d) => {
    estado.usuario = { ...estado.usuario, ...(await api('PATCH', '/eu', d)).usuario };
    avisar('Dados salvos.');
  });
  aoEnviar($('#f-senha', c), async (d, form) => {
    await api('POST', '/eu/senha', d);
    form.reset();
    avisar('Senha trocada.');
  });
  $('#sair', c).addEventListener('click', async () => {
    await api('POST', '/sair');
    estado.usuario = null;
    navegar('#/entrar');
  });
}

// ====================================================================== CLIENTE
async function cliInicio(c) {
  const d = await api('GET', '/cliente/inicio');
  const proxima = d.cobrancas_abertas[0];
  c.innerHTML = `${cabecalho('Portal do cliente', `Olá, ${e(primeiroNome(estado.usuario.nome))}.`, 'Aqui está o resumo do que o escritório está fazendo por você.')}
    <div class="grade grade-4">
      <a class="indicador" href="#/processos"><small>Processos em andamento</small><strong>${d.processos.filter((p) => p.status === 'ativo').length}</strong></a>
      <a class="indicador ${d.mensagens_nao_lidas ? 'ok' : ''}" href="#/mensagens"><small>Mensagens novas</small><strong>${d.mensagens_nao_lidas}</strong></a>
      <a class="indicador ${d.documentos_pendentes ? 'perigo' : ''}" href="#/documentos"><small>Documentos para assinar</small><strong>${d.documentos_pendentes}</strong></a>
      <a class="indicador ${proxima?.situacao === 'atrasada' ? 'perigo' : ''}" href="#/pagamentos"><small>Próximo pagamento</small><strong>${proxima ? reais(proxima.valor_centavos) : '—'}</strong></a>
    </div>
    <div class="grade grade-2 margem-topo">
      <section class="cartao"><div class="cartao-titulo"><h2>Seus processos</h2><a href="#/processos" class="pequeno">Ver todos</a></div>
        ${d.processos.length ? `<ul class="lista">${d.processos.slice(0, 4).map((p) => `
          <li><a class="item" href="#/processo/${p.id}"><div class="titulo">${e(p.titulo)}</div><div class="meta">${e(p.ultimo_andamento || 'Sem andamentos ainda')}</div></a>${selo(STATUS_PROCESSO, p.status)}</li>`).join('')}</ul>`
    : vazio('Nenhum processo por enquanto', 'Quando o escritório iniciar o seu caso, ele aparece aqui com cada andamento.')}
      </section>
      <section class="cartao"><div class="cartao-titulo"><h2>Precisa de algo?</h2></div>
        <p class="suave">Mande sua dúvida ao escritório ou peça um novo serviço. Respondemos por aqui.</p>
        <div class="acoes"><a class="botao" href="#/mensagens">${icone('mensagem')} Mandar mensagem</a><a class="botao claro" href="#/servicos">${icone('servico')} Pedir um serviço</a></div>
        ${d.solicitacoes.length ? `<br><h3>Seus pedidos</h3><ul class="lista">${d.solicitacoes.slice(0, 3).map((s) => `<li><div><div class="titulo">${e(s.assunto)}</div>${s.resposta ? `<div class="meta">${e(s.resposta)}</div>` : ''}</div>${selo(STATUS_SOLICITACAO, s.status)}</li>`).join('')}</ul>` : ''}
      </section>
    </div>`;
}

function itemProcesso(p, base) {
  return `<li><a class="item" href="${base}${p.id}"><div class="titulo">${e(p.titulo)}</div>
    <div class="meta">${e(p.numero_cnj || 'Número ainda não distribuído')} · ${e(nomeArea(p.area))}${p.cliente_nome && ehEscritorio() ? ` · ${e(p.cliente_nome)}` : ''}</div>
    <div class="meta">${e(p.ultimo_andamento || 'Sem andamentos')}</div></a>${selo(STATUS_PROCESSO, p.status)}</li>`;
}

async function cliProcessos(c) {
  const lista = await api('GET', '/cliente/processos');
  c.innerHTML = `${cabecalho('Acompanhamento', 'Seus processos', 'Os andamentos chegam dos tribunais e do escritório automaticamente.')}
    <section class="cartao">${lista.length ? `<ul class="lista">${lista.map((p) => itemProcesso(p, '#/processo/')).join('')}</ul>` : vazio('Nenhum processo por enquanto')}</section>`;
}

function linhaDoTempo(andamentos, { interno = false } = {}) {
  if (!andamentos.length) return vazio('Ainda não há andamentos', 'Assim que algo acontecer no processo, aparece aqui.');
  return `<ol class="tempo">${andamentos.map((a) => `
    <li class="${a.visivel_cliente ? '' : 'interno'}" data-andamento="${a.id}">
      <div class="quando">${dataBr(a.data)}${interno ? ` · ${a.origem === 'datajud' ? 'tribunal (automático)' : a.origem === 'claude' ? 'lançado pelo Claude' : e(a.autor_nome || 'escritório')}${a.visivel_cliente ? '' : ' · nota interna'}` : ''}</div>
      <div class="oque">${e(a.descricao)}</div>
      ${a.explicacao ? `<div class="explica"><strong>O que isso significa:</strong> ${e(a.explicacao)}</div>` : ''}
      ${interno ? `<div class="acoes">
        <button class="botao pequeno claro" type="button" data-acao="explicar">${a.explicacao ? 'Editar explicação' : 'Explicar ao cliente'}</button>
        <button class="botao pequeno claro" type="button" data-acao="visibilidade">${a.visivel_cliente ? 'Tornar interno' : 'Mostrar ao cliente'}</button></div>` : ''}
    </li>`).join('')}</ol>`;
}

async function cliProcesso(c, id) {
  const p = await api('GET', `/cliente/processos/${encodeURIComponent(id)}`);
  c.innerHTML = `<a class="voltar" href="#/processos">${icone('voltar')} Processos</a>
    ${cabecalho(nomeArea(p.area), e(p.titulo), `${e(p.numero_cnj || 'Número ainda não distribuído')}${p.tribunal ? ` · ${e(p.tribunal)}` : ''}`, selo(STATUS_PROCESSO, p.status))}
    <section class="cartao"><h2>Andamentos</h2><br>${linhaDoTempo(p.andamentos)}</section>
    <section class="cartao destaque-ouro"><div class="acoes"><span>Ficou com dúvida sobre algum andamento?</span><a class="botao ouro" href="#/mensagens">Perguntar ao escritório</a></div></section>`;
}

// Conversa (usada pelo cliente e pelo escritório).
function montarConversa(alvo, { carregar, enviar, souEscritorio, extraAcoes = '' }) {
  alvo.innerHTML = `<div class="conversa">
      <div class="bolhas" aria-live="polite"></div>
      <form class="compor"><label class="sr" for="texto-msg">Mensagem</label>
        <textarea id="texto-msg" name="texto" placeholder="Escreva sua mensagem…" rows="2" required></textarea>
        <div class="acoes">${extraAcoes}<button class="botao" type="submit" aria-label="Enviar">${icone('enviar')}<span class="esconde-movel">Enviar</span></button></div>
      </form></div>`;
  const bolhas = $('.bolhas', alvo);
  const form = $('form', alvo);
  let ultimaQtd = -1;
  const desenhar = (msgs) => {
    if (msgs.length === ultimaQtd) return;
    ultimaQtd = msgs.length;
    bolhas.innerHTML = msgs.length ? msgs.map((m) => {
      const minha = souEscritorio ? m.do_escritorio : !m.do_escritorio;
      return `<div class="bolha ${minha ? 'minha' : 'outra'}">${e(m.texto)}<span class="assina">${m.do_escritorio ? e(m.autor_nome || 'Escritório') : e(m.autor_nome || 'Cliente')} · ${quando(m.criado_em)}</span></div>`;
    }).join('') : vazio('Nenhuma mensagem ainda', souEscritorio ? 'Comece a conversa.' : 'Escreva sua dúvida. O escritório responde por aqui.');
    bolhas.scrollTop = bolhas.scrollHeight;
  };
  const atualizar = async () => { try { desenhar(await carregar()); } catch { /* tenta de novo no próximo ciclo */ } };
  atualizar();
  const t = setInterval(atualizar, 8000);
  estado.limpeza.push(() => clearInterval(t));
  $('textarea', form).addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) form.requestSubmit();
  });
  aoEnviar(form, async (d) => {
    await enviar(d.texto);
    form.reset();
    await atualizar();
  });
  return form;
}

async function cliMensagens(c) {
  const ct = estado.marca.contato;
  c.innerHTML = `${cabecalho('Fale com o escritório', 'Mensagens', `Respostas em horário de expediente.${ct.whatsapp ? ` Urgente? <a href="https://wa.me/${e(ct.whatsapp)}" target="_blank" rel="noopener">WhatsApp ${e(ct.whatsappExibicao)}</a>.` : ''}`)}
    <section class="cartao" id="chat"></section>`;
  montarConversa($('#chat', c), {
    carregar: () => api('GET', '/cliente/mensagens'),
    enviar: (texto) => api('POST', '/cliente/mensagens', { texto }),
    souEscritorio: false,
  });
  setTimeout(atualizarContadores, 600);
}

function listaDocumentos(docs, { escritorio = false } = {}) {
  if (!docs.length) return vazio('Nenhum documento ainda', escritorio ? '' : 'Contrato, procuração e demais documentos aparecem aqui.');
  return `<div class="tabela-envolve"><table><thead><tr><th>Documento</th><th class="esconde-movel">Tipo</th><th class="esconde-movel">Enviado</th><th>Situação</th><th></th></tr></thead><tbody>
    ${docs.map((d) => `<tr data-doc="${d.id}"><td><strong>${e(d.titulo)}</strong><div class="suave pequeno">${e(d.nome_original)}</div></td>
      <td class="esconde-movel">${e(TIPOS_DOC[d.tipo] || d.tipo)}</td>
      <td class="esconde-movel suave pequeno">${dataBr(d.criado_em)}<br>${d.do_escritorio ? 'pelo escritório' : 'pelo cliente'}</td>
      <td>${escritorio ? `<select data-status-doc aria-label="Situação">${Object.entries(STATUS_DOC).map(([k, [t]]) => `<option value="${k}" ${k === d.status ? 'selected' : ''}>${t}</option>`).join('')}</select>` : selo(STATUS_DOC, d.status)}</td>
      <td class="num"><a class="botao pequeno claro" href="/api/documentos/${d.id}/arquivo">${icone('baixar')}<span class="esconde-movel">Baixar</span></a></td></tr>`).join('')}
    </tbody></table></div>`;
}

async function cliDocumentos(c) {
  const docs = await api('GET', '/cliente/documentos');
  c.innerHTML = `${cabecalho('Seu arquivo', 'Documentos', 'Contrato de honorários, procuração e tudo o que você enviou ou recebeu.', `<button class="botao" type="button" id="enviar-doc">${icone('mais')} Enviar documento</button>`)}
    <section class="cartao">${listaDocumentos(docs)}</section>
    ${docs.some((d) => d.status === 'aguardando_assinatura') ? `<section class="cartao destaque-ouro"><p><strong>Como assinar:</strong> baixe o documento, assine (à mão ou pelo gov.br) e envie de volta aqui mesmo, pelo botão "Enviar documento".</p></section>` : ''}`;
  $('#enviar-doc', c).addEventListener('click', () => {
    abrirModal('Enviar documento', `<form>
      <div class="campo"><label>Que documento é?</label><select name="tipo"><option value="documento_pessoal">Documento pessoal (RG, CNH, comprovante de residência…)</option><option value="comprovante">Comprovante de pagamento</option><option value="outro">Outro (inclusive documento assinado)</option></select></div>
      <div class="campo"><label>Descrição</label><input name="titulo" type="text" placeholder="Ex.: Procuração assinada"></div>
      <div class="campo"><label>Arquivo</label><input name="arquivo" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" required><small>PDF, foto ou Word, até 15 MB.</small></div>
      <button class="botao" type="submit">Enviar</button></form>`, async (form) => {
      await api('POST', '/cliente/documentos', new FormData(form));
      avisar('Documento enviado ao escritório.');
      rotear();
    });
  });
}

async function cliPagamentos(c) {
  const lista = await api('GET', '/cliente/cobrancas');
  const pg = estado.marca.pagamento;
  const abertas = lista.filter((x) => x.status === 'aberta');
  const total = abertas.reduce((s, x) => s + x.valor_centavos, 0);
  c.innerHTML = `${cabecalho('Honorários', 'Pagamentos', abertas.length ? `Em aberto: <strong>${reais(total)}</strong> em ${abertas.length} ${abertas.length === 1 ? 'parcela' : 'parcelas'}.` : 'Tudo em dia.')}
    ${pg.chavePix ? `<section class="cartao destaque-ouro"><h3>Pague por Pix</h3><p class="suave">Favorecido: ${e(pg.favorecido)}</p>
      <div class="acoes"><span class="pix" id="pix">${e(pg.chavePix)}</span><button class="botao pequeno ouro" type="button" id="copiar-pix">Copiar chave</button></div>
      <p class="suave pequeno">${e(pg.instrucoes)}</p></section>` : ''}
    <section class="cartao">${lista.length ? `<div class="tabela-envolve"><table><thead><tr><th>Descrição</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${lista.map((x) => `<tr><td>${e(x.descricao)}</td><td>${dataBr(x.vencimento)}</td><td class="num">${reais(x.valor_centavos)}</td>
        <td>${selo(SITUACAO_COBRANCA, x.situacao)}${x.pago_em ? `<div class="suave pequeno">em ${dataBr(x.pago_em)}</div>` : ''}</td>
        <td class="num">${x.status === 'aberta' && x.link_pagamento ? `<a class="botao pequeno" href="${e(x.link_pagamento)}" target="_blank" rel="noopener">Pagar</a>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : vazio('Nenhuma cobrança', 'Os honorários combinados com o escritório aparecem aqui.')}</section>`;
  $('#copiar-pix', c)?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pg.chavePix); avisar('Chave Pix copiada.'); } catch { avisar('Selecione e copie a chave manualmente.', 'erro'); }
  });
}

async function cliServicos(c) {
  const minhas = await api('GET', '/cliente/solicitacoes');
  const areas = estado.marca.areas;
  c.innerHTML = `${cabecalho('Como podemos ajudar', 'Serviços do escritório', 'Escolha a área e conte o que precisa. O escritório analisa e responde por aqui.')}
    <div class="grade grade-3">${areas.map((a) => `<article class="cartao servico"><h3>${e(a.nome)}</h3><p>${e(a.descricao)}</p>
      <button class="botao claro" type="button" data-area="${e(a.id)}">Pedir análise</button></article>`).join('')}</div>
    <section class="cartao"><h2>Seus pedidos</h2><br>${minhas.length ? `<ul class="lista">${minhas.map((s) => `<li><div><div class="titulo">${e(s.assunto)}</div>
      <div class="meta">${e(nomeArea(s.area))} · enviado em ${dataBr(s.criado_em)}</div>${s.resposta ? `<div class="explica pequeno">${e(s.resposta)}</div>` : ''}</div>${selo(STATUS_SOLICITACAO, s.status)}</li>`).join('')}</ul>`
    : vazio('Nenhum pedido ainda')}</section>
    <p class="suave pequeno">O pedido não gera contratação automática: o escritório analisa o caso e, se for o caso, apresenta proposta e contrato.</p>`;
  $$('[data-area]', c).forEach((b) => b.addEventListener('click', () => {
    abrirModal('Pedir análise', `<form>
      <div class="campo"><label>Área</label><select name="area">${opcoesAreas(b.dataset.area)}</select></div>
      <div class="campo"><label>Assunto</label><input name="assunto" type="text" required maxlength="200" placeholder="Ex.: Aposentadoria negada pelo INSS"></div>
      <div class="campo"><label>Conte o que aconteceu</label><textarea name="descricao" required rows="5" placeholder="Datas, valores, documentos que você tem…"></textarea></div>
      <button class="botao" type="submit">Enviar pedido</button></form>`, async (_f, d) => {
      await api('POST', '/cliente/solicitacoes', d);
      avisar('Pedido enviado. O escritório vai responder por aqui.');
      rotear();
    });
  }));
}

function cliEscritorio(c) {
  const m = estado.marca;
  const redes = [['site', 'Site'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube']]
    .filter(([k]) => m.links[k]);
  c.innerHTML = `${cabecalho('Quem cuida do seu caso', e(m.marca.nomeCompleto), e(m.marca.assinatura))}
    <div class="grade grade-2">
      <section class="cartao"><h2>Contato</h2><br><ul class="lista">
        <li><div><div class="titulo">${e(m.advogado.nome)}</div><div class="meta">${e(m.advogado.oab)}</div></div></li>
        ${m.contato.whatsapp ? `<li><div><div class="titulo">WhatsApp</div><div class="meta">${e(m.contato.whatsappExibicao)}</div></div><a class="botao pequeno" href="https://wa.me/${e(m.contato.whatsapp)}" target="_blank" rel="noopener">${icone('whatsapp')} Abrir</a></li>` : ''}
        ${m.contato.email ? `<li><div><div class="titulo">E-mail</div><div class="meta">${e(m.contato.email)}</div></div><a class="botao pequeno claro" href="mailto:${e(m.contato.email)}">Escrever</a></li>` : ''}
        ${m.contato.endereco ? `<li><div><div class="titulo">Endereço</div><div class="meta">${e(m.contato.endereco)}</div></div></li>` : ''}
        ${m.contato.horario ? `<li><div><div class="titulo">Atendimento</div><div class="meta">${e(m.contato.horario)}</div></div></li>` : ''}
      </ul></section>
      <section class="cartao"><h2>Áreas de atuação</h2><br><ul class="lista">${m.areas.map((a) => `<li><div><div class="titulo">${e(a.nome)}</div><div class="meta">${e(a.descricao)}</div></div></li>`).join('')}</ul>
        ${redes.length ? `<br><div class="links-sociais">${redes.map(([k, rot]) => `<a class="botao claro pequeno" href="${e(m.links[k])}" target="_blank" rel="noopener">${rot}</a>`).join('')}</div>` : ''}</section>
    </div>`;
}

// ====================================================================== ESCRITÓRIO
async function escPainel(c) {
  const p = await api('GET', '/escritorio/painel');
  const maxMes = Math.max(1, ...p.entradas_por_mes.map((x) => x.n));
  const mesNome = (ym) => new Date(`${ym}-15`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  c.innerHTML = `${cabecalho(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }), `Bom trabalho, ${e(primeiroNome(estado.usuario.nome))}.`, 'O escritório em uma tela.',
    `<a class="botao ouro" href="#/assistente">${icone('claude')} Pedir ao Claude</a>`)}
    <div class="grade grade-4">
      <a class="indicador" href="#/clientes"><small>Clientes ativos</small><strong>${p.clientes_ativos}</strong></a>
      <a class="indicador ok" href="#/clientes"><small>Novos nos últimos 30 dias</small><strong>${p.clientes_novos_30d}</strong></a>
      <a class="indicador" href="#/mensagens"><small>Mensagens sem resposta</small><strong>${p.mensagens_nao_lidas}</strong></a>
      <a class="indicador" href="#/solicitacoes"><small>Pedidos novos</small><strong>${p.solicitacoes_novas}</strong></a>
      <a class="indicador ok" href="#/financeiro"><small>Recebido no mês</small><strong>${reais(p.recebido_mes_centavos)}</strong></a>
      <a class="indicador" href="#/financeiro"><small>A receber</small><strong>${reais(p.a_receber_centavos)}</strong></a>
      <a class="indicador perigo" href="#/financeiro"><small>Em atraso · ${p.clientes_inadimplentes} ${p.clientes_inadimplentes === 1 ? 'cliente' : 'clientes'}</small><strong>${reais(p.em_atraso_centavos)}</strong></a>
      <a class="indicador" href="#/processos"><small>Processos ativos</small><strong>${p.processos_ativos}</strong></a>
    </div>
    <div class="grade grade-2 margem-topo">
      <section class="cartao"><div class="cartao-titulo"><h2>Vencem em 7 dias</h2><a class="pequeno" href="#/financeiro">Financeiro</a></div>
        ${p.vencendo_7d.length ? `<ul class="lista">${p.vencendo_7d.map((x) => `<li><a class="item" href="#/cliente/${x.cliente_id}"><div class="titulo">${e(x.cliente_nome)}</div><div class="meta">${e(x.descricao)} · ${dataBr(x.vencimento)}</div></a><strong>${reais(x.valor_centavos)}</strong></li>`).join('')}</ul>` : vazio('Nada vencendo esta semana')}
      </section>
      <section class="cartao"><div class="cartao-titulo"><h2>Entrada de clientes</h2><span class="suave pequeno">últimos 6 meses</span></div>
        ${p.entradas_por_mes.length ? `<div class="barras">${p.entradas_por_mes.map((x) => `<div class="coluna"><b>${x.n}</b><div class="barra" data-altura="${Math.round((x.n / maxMes) * 100)}"></div><small>${mesNome(x.mes)}</small></div>`).join('')}</div>` : vazio('Sem cadastros no período')}
      </section>
    </div>
    <section class="cartao"><div class="cartao-titulo"><h2>Últimos andamentos</h2><a class="pequeno" href="#/processos">Processos</a></div>
      ${p.andamentos_recentes.length ? `<ul class="lista">${p.andamentos_recentes.map((a) => `<li><a class="item" href="#/processo/${a.processo_id}"><div class="titulo">${e(a.descricao)}</div><div class="meta">${e(a.cliente_nome)} · ${e(a.titulo)} · ${dataBr(a.data)}</div></a>${a.origem === 'datajud' ? '<span class="selo verde">tribunal</span>' : a.origem === 'claude' ? '<span class="selo ouro">Claude</span>' : ''}</li>`).join('')}</ul>` : vazio('Nenhum andamento lançado')}
    </section>`;
  // Altura das barras via CSSOM (permitido pela política de segurança).
  $$('.barra', c).forEach((b) => { b.style.height = `${b.dataset.altura}%`; });
}

async function escClientes(c) {
  let situacao = 'todos';
  c.innerHTML = `${cabecalho('Carteira', 'Clientes', '', `<button class="botao" type="button" id="novo-cliente">${icone('mais')} Novo cliente</button>`)}
    <section class="cartao">
      <div class="barra-busca"><label class="sr" for="busca">Buscar</label><input id="busca" type="search" placeholder="Buscar por nome, e-mail, CPF ou telefone">
        <div class="filtros" role="group" aria-label="Situação">${[['todos', 'Todos'], ['em_dia', 'Em dia'], ['inadimplentes', 'Inadimplentes'], ['inativos', 'Acesso desativado']].map(([k, t]) => `<button type="button" data-sit="${k}" aria-pressed="${k === situacao}">${t}</button>`).join('')}</div></div>
      <div id="tabela"></div>
    </section>`;
  const carregar = async () => {
    const lista = await api('GET', `/escritorio/clientes?busca=${encodeURIComponent($('#busca', c).value)}&situacao=${situacao}`);
    $('#tabela', c).innerHTML = lista.length ? `<div class="tabela-envolve"><table><thead><tr><th>Cliente</th><th class="esconde-movel">Área</th><th class="num esconde-movel">Processos</th><th class="num">Em atraso</th><th class="esconde-movel">Desde</th></tr></thead><tbody>
      ${lista.map((x) => `<tr class="clicavel" data-ir="#/cliente/${x.id}"><td><strong>${e(x.nome)}</strong> ${x.mensagens_nao_lidas ? '<span class="selo ouro">mensagem</span>' : ''} ${x.ativo ? '' : '<span class="selo">sem acesso</span>'}<div class="suave pequeno">${e(x.email)}${x.telefone ? ` · ${e(x.telefone)}` : ''}</div></td>
        <td class="esconde-movel">${e(nomeArea(x.area_interesse))}</td><td class="num esconde-movel">${x.processos_ativos}</td>
        <td class="num">${x.em_atraso_centavos ? `<span class="selo perigo">${reais(x.em_atraso_centavos)}</span>` : '<span class="selo ok">em dia</span>'}</td>
        <td class="esconde-movel suave pequeno">${dataBr(x.criado_em)}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhum cliente encontrado');
  };
  let atraso;
  $('#busca', c).addEventListener('input', () => { clearTimeout(atraso); atraso = setTimeout(carregar, 250); });
  $$('[data-sit]', c).forEach((b) => b.addEventListener('click', () => {
    situacao = b.dataset.sit;
    $$('[data-sit]', c).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    carregar();
  }));
  c.addEventListener('click', (ev) => { const tr = ev.target.closest('[data-ir]'); if (tr) navegar(tr.dataset.ir); });
  $('#novo-cliente', c).addEventListener('click', () => abrirModal('Novo cliente', `<form>
      <p class="suave pequeno">Crie o acesso para o cliente e envie a ele o e-mail e a senha provisória. Ele pode trocar a senha depois.</p>
      <div class="campo"><label>Nome completo</label><input name="nome" type="text" required></div>
      <div class="linha-campos"><div class="campo"><label>E-mail</label><input name="email" type="email" required></div><div class="campo"><label>Telefone</label><input name="telefone" type="tel"></div></div>
      <div class="linha-campos"><div class="campo"><label>CPF</label><input name="cpf" type="text"></div><div class="campo"><label>Área</label><select name="area_interesse">${opcoesAreas()}</select></div></div>
      <div class="campo"><label>Senha provisória</label><input name="senha" type="text" minlength="8" required value="${e(senhaAleatoria())}"></div>
      <label class="caixa-marcar"><input type="checkbox" name="consentimento" value="1" required><span>O cliente autorizou o tratamento dos dados (LGPD).</span></label>
      <button class="botao" type="submit">Criar cliente</button></form>`, async (_f, d) => {
    const novo = await api('POST', '/escritorio/clientes', { ...d, consentimento: Boolean(d.consentimento) });
    avisar('Cliente criado.');
    navegar(`#/cliente/${novo.id}`);
  }));
  await carregar();
}

const senhaAleatoria = () => {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return [...a].map((x) => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
};

function formCobranca(clienteId) {
  return `<form>
    <div class="campo"><label>Descrição</label><input name="descricao" type="text" required placeholder="Ex.: Honorários contratuais — aposentadoria"></div>
    <div class="linha-campos"><div class="campo"><label>Valor total (R$)</label><input name="valor" type="text" inputmode="decimal" required placeholder="3.000,00"></div>
      <div class="campo"><label>Parcelas</label><input name="parcelas" type="number" min="1" max="60" value="1"></div></div>
    <div class="campo"><label>Primeiro vencimento</label><input name="vencimento" type="date" required value="${hojeIso()}"><small>As demais parcelas vencem no mesmo dia dos meses seguintes.</small></div>
    <div class="campo"><label>Link de pagamento (opcional)</label><input name="link_pagamento" type="text" placeholder="https://…"></div>
    <input type="hidden" name="cliente_id" value="${clienteId}">
    <button class="botao" type="submit">Criar cobrança</button></form>`;
}

async function escCliente(c, id) {
  const d = await api('GET', `/escritorio/clientes/${encodeURIComponent(id)}`);
  const cl = d.cliente;
  const atraso = d.cobrancas.filter((x) => x.situacao === 'atrasada').reduce((s, x) => s + x.valor_centavos, 0);
  const pago = d.cobrancas.filter((x) => x.status === 'paga').reduce((s, x) => s + x.valor_centavos, 0);
  c.innerHTML = `<a class="voltar" href="#/clientes">${icone('voltar')} Clientes</a>
    ${cabecalho(nomeArea(cl.area_interesse), e(cl.nome), `${e(cl.email)}${cl.telefone ? ` · ${e(cl.telefone)}` : ''} · cliente desde ${dataBr(cl.criado_em)}`,
    `<a class="botao" href="#/mensagens/${cl.id}">${icone('mensagem')} Conversa</a>${cl.telefone ? `<a class="botao claro" target="_blank" rel="noopener" href="https://wa.me/55${e(String(cl.telefone).replace(/\D/g, '').replace(/^55/, ''))}">${icone('whatsapp')} WhatsApp</a>` : ''}`)}
    <div class="grade grade-4">
      <div class="indicador"><small>Processos</small><strong>${d.processos.length}</strong></div>
      <div class="indicador ok"><small>Total pago</small><strong>${reais(pago)}</strong></div>
      <div class="indicador ${atraso ? 'perigo' : ''}"><small>Em atraso</small><strong>${reais(atraso)}</strong></div>
      <div class="indicador"><small>Último acesso</small><strong class="pequeno-indicador">${cl.ultimo_acesso ? dataBr(cl.ultimo_acesso) : 'nunca'}</strong></div>
    </div>
    <div class="abas margem-topo" role="tablist">${[['processos', 'Processos'], ['financeiro', 'Financeiro'], ['documentos', 'Documentos'], ['pedidos', 'Pedidos'], ['dados', 'Dados']].map(([k, t], i) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
    <div data-painel="processos"><section class="cartao"><div class="cartao-titulo"><h2>Processos</h2><button class="botao pequeno" type="button" id="novo-proc">${icone('mais')} Novo processo</button></div>
      ${d.processos.length ? `<ul class="lista">${d.processos.map((p) => itemProcesso(p, '#/processo/')).join('')}</ul>` : vazio('Nenhum processo cadastrado')}</section></div>
    <div data-painel="financeiro" class="oculto"><section class="cartao"><div class="cartao-titulo"><h2>Cobranças</h2><button class="botao pequeno" type="button" id="nova-cob">${icone('mais')} Nova cobrança</button></div>
      ${tabelaCobrancas(d.cobrancas, false)}</section></div>
    <div data-painel="documentos" class="oculto"><section class="cartao"><div class="cartao-titulo"><h2>Documentos</h2><button class="botao pequeno" type="button" id="novo-doc">${icone('mais')} Enviar documento</button></div>
      ${listaDocumentos(d.documentos, { escritorio: true })}</section></div>
    <div data-painel="pedidos" class="oculto"><section class="cartao"><h2>Pedidos do cliente</h2><br>${listaSolicitacoes(d.solicitacoes)}</section></div>
    <div data-painel="dados" class="oculto"><form class="cartao" id="f-dados"><h2>Dados cadastrais</h2><br>
      <div class="linha-campos"><div class="campo"><label>Nome</label><input name="nome" type="text" value="${e(cl.nome)}"></div><div class="campo"><label>Telefone</label><input name="telefone" type="tel" value="${e(cl.telefone || '')}"></div></div>
      <div class="linha-campos"><div class="campo"><label>CPF</label><input name="cpf" type="text" value="${e(cl.cpf || '')}"></div><div class="campo"><label>Área</label><select name="area_interesse">${opcoesAreas(cl.area_interesse)}</select></div></div>
      <div class="campo"><label>Endereço</label><input name="endereco" type="text" value="${e(cl.endereco || '')}"></div>
      <div class="campo"><label>Observações internas</label><textarea name="observacoes" rows="3">${e(cl.observacoes || '')}</textarea><small>Não aparecem para o cliente.</small></div>
      <div class="acoes"><button class="botao" type="submit">Salvar</button>
      ${ehGestor() ? `<button class="botao ${cl.ativo ? 'perigo' : 'claro'}" type="button" id="acesso">${cl.ativo ? 'Desativar acesso' : 'Reativar acesso'}</button><button class="botao claro" type="button" id="reset">Redefinir senha</button>` : ''}</div>
    </form></div>`;

  $$('[data-aba]', c).forEach((b) => b.addEventListener('click', () => {
    $$('[data-aba]', c).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-painel]', c).forEach((p) => p.classList.toggle('oculto', p.dataset.painel !== b.dataset.aba));
  }));
  ligarCobrancas(c);
  ligarSolicitacoes(c);
  ligarDocumentos(c);

  $('#novo-proc', c).addEventListener('click', async () => {
    const equipe = await api('GET', '/escritorio/equipe');
    abrirModal('Novo processo', `<form>
      <div class="campo"><label>Título</label><input name="titulo" type="text" required placeholder="Ex.: Aposentadoria por idade rural"></div>
      <div class="campo"><label>Número CNJ</label><input name="numero_cnj" type="text" placeholder="0000000-00.0000.0.00.0000"><small>Com o número, os andamentos do tribunal chegam sozinhos (DataJud/CNJ).</small></div>
      <div class="linha-campos"><div class="campo"><label>Área</label><select name="area">${opcoesAreas(cl.area_interesse)}</select></div>
        <div class="campo"><label>Tribunal / vara</label><input name="tribunal" type="text" placeholder="Ex.: 1ª Vara de Corumbá"></div></div>
      <div class="campo"><label>Responsável</label><select name="responsavel_id"><option value="">—</option>${equipe.filter((x) => x.ativo).map((x) => `<option value="${x.id}">${e(x.nome)}</option>`).join('')}</select></div>
      <input type="hidden" name="cliente_id" value="${cl.id}"><button class="botao" type="submit">Criar processo</button></form>`, async (_f, dd) => {
      const p = await api('POST', '/escritorio/processos', { ...dd, cliente_id: cl.id, responsavel_id: dd.responsavel_id ? Number(dd.responsavel_id) : null });
      avisar('Processo criado.');
      navegar(`#/processo/${p.id}`);
    });
  });
  $('#nova-cob', c).addEventListener('click', () => abrirModal('Nova cobrança', formCobranca(cl.id), async (_f, dd) => {
    await api('POST', '/escritorio/cobrancas', { ...dd, cliente_id: cl.id, parcelas: Number(dd.parcelas || 1) });
    avisar('Cobrança criada.');
    rotear();
  }));
  $('#novo-doc', c).addEventListener('click', () => abrirModal('Enviar documento ao cliente', `<form>
      <div class="campo"><label>Tipo</label><select name="tipo">${Object.entries(TIPOS_DOC).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
      <div class="campo"><label>Título</label><input name="titulo" type="text" placeholder="Ex.: Contrato de honorários — revisão de benefício"></div>
      <div class="campo"><label>Situação</label><select name="status"><option value="disponivel">Disponível</option><option value="aguardando_assinatura">Aguardando assinatura do cliente</option><option value="assinado">Assinado</option></select></div>
      ${d.processos.length ? `<div class="campo"><label>Processo (opcional)</label><select name="processo_id"><option value="">—</option>${d.processos.map((p) => `<option value="${p.id}">${e(p.titulo)}</option>`).join('')}</select></div>` : ''}
      <div class="campo"><label>Arquivo</label><input name="arquivo" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"></div>
      <button class="botao" type="submit">Enviar</button></form>`, async (form) => {
    await api('POST', `/escritorio/clientes/${cl.id}/documentos`, new FormData(form));
    avisar('Documento disponível para o cliente.');
    rotear();
  }));
  aoEnviar($('#f-dados', c), async (dd) => { await api('PATCH', `/escritorio/clientes/${cl.id}`, dd); avisar('Dados salvos.'); });
  $('#acesso', c)?.addEventListener('click', async () => {
    if (cl.ativo && !confirm(`Desativar o acesso de ${cl.nome}? A pessoa sai do aplicativo na hora. Os dados ficam guardados.`)) return;
    await api('POST', `/escritorio/gestor/acesso/${cl.id}`, { ativo: !cl.ativo });
    avisar(cl.ativo ? 'Acesso desativado.' : 'Acesso reativado.');
    rotear();
  });
  $('#reset', c)?.addEventListener('click', () => redefinirSenha(cl));
}

function redefinirSenha(pessoa) {
  abrirModal(`Nova senha para ${pessoa.nome}`, `<form><p class="suave pequeno">A pessoa sai de todos os aparelhos e entra com a nova senha.</p>
    <div class="campo"><label>Nova senha</label><input name="nova" type="text" minlength="8" required value="${e(senhaAleatoria())}"></div>
    <button class="botao" type="submit">Redefinir</button></form>`, async (_f, d) => {
    await api('POST', `/escritorio/gestor/senha/${pessoa.id}`, d);
    avisar('Senha redefinida. Envie a nova senha à pessoa.');
  });
}

function tabelaCobrancas(lista, comCliente) {
  if (!lista.length) return vazio('Nenhuma cobrança');
  return `<div class="tabela-envolve"><table><thead><tr>${comCliente ? '<th>Cliente</th>' : ''}<th>Descrição</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
    ${lista.map((x) => `<tr data-cob="${x.id}">${comCliente ? `<td><a href="#/cliente/${x.cliente_id}">${e(x.cliente_nome)}</a></td>` : ''}<td>${e(x.descricao)}</td><td>${dataBr(x.vencimento)}</td>
      <td class="num">${reais(x.valor_centavos)}</td><td>${selo(SITUACAO_COBRANCA, x.situacao)}${x.pago_em ? `<div class="suave pequeno">em ${dataBr(x.pago_em)}</div>` : ''}</td>
      <td class="num"><div class="acoes">${x.status === 'aberta' ? `<button class="botao pequeno" type="button" data-pagar>Recebido</button><button class="botao pequeno claro" type="button" data-cancelar>Cancelar</button>`
    : `<button class="botao pequeno claro" type="button" data-reabrir>Reabrir</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
}

function ligarCobrancas(c) {
  c.addEventListener('click', async (ev) => {
    const tr = ev.target.closest('[data-cob]');
    if (!tr) return;
    const acao = ev.target.closest('[data-pagar]') ? 'paga' : ev.target.closest('[data-cancelar]') ? 'cancelada' : ev.target.closest('[data-reabrir]') ? 'aberta' : null;
    if (!acao) return;
    if (acao === 'cancelada' && !confirm('Cancelar esta cobrança?')) return;
    try {
      await api('PATCH', `/escritorio/cobrancas/${tr.dataset.cob}`, { status: acao });
      avisar({ paga: 'Pagamento registrado.', cancelada: 'Cobrança cancelada.', aberta: 'Cobrança reaberta.' }[acao]);
      rotear();
    } catch (err) { avisar(err.message, 'erro'); }
  });
}

function listaSolicitacoes(lista, comCliente = false) {
  if (!lista.length) return vazio('Nenhum pedido');
  return `<ul class="lista">${lista.map((s) => `<li data-sol="${s.id}"><div><div class="titulo">${e(s.assunto)}</div>
    <div class="meta">${comCliente ? `<a href="#/cliente/${s.cliente_id}">${e(s.cliente_nome)}</a> · ` : ''}${e(nomeArea(s.area))} · ${dataBr(s.criado_em)}</div>
    <p class="pequeno">${e(s.descricao)}</p>${s.resposta ? `<div class="explica pequeno"><strong>Resposta:</strong> ${e(s.resposta)}</div>` : ''}</div>
    <div class="acoes">${selo(STATUS_SOLICITACAO, s.status)}<button class="botao pequeno claro" type="button" data-responder>Responder</button></div></li>`).join('')}</ul>`;
}

function ligarSolicitacoes(c) {
  c.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-responder]')) return;
    const id = ev.target.closest('[data-sol]').dataset.sol;
    abrirModal('Responder pedido', `<form>
      <div class="campo"><label>Situação</label><select name="status">${Object.entries(STATUS_SOLICITACAO).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
      <div class="campo"><label>Resposta ao cliente</label><textarea name="resposta" rows="4" placeholder="Ex.: Recebemos. Para analisar, envie a carta de indeferimento do INSS."></textarea></div>
      <button class="botao" type="submit">Salvar</button></form>`, async (_f, d) => {
      await api('PATCH', `/escritorio/solicitacoes/${id}`, d);
      avisar('Pedido atualizado.');
      rotear();
    });
  });
}

function ligarDocumentos(c) {
  c.addEventListener('change', async (ev) => {
    const sel = ev.target.closest('[data-status-doc]');
    if (!sel) return;
    try {
      await api('PATCH', `/escritorio/documentos/${sel.closest('[data-doc]').dataset.doc}`, { status: sel.value });
      avisar('Situação do documento atualizada.');
    } catch (err) { avisar(err.message, 'erro'); }
  });
}

async function escProcessos(c) {
  let status = 'ativo';
  c.innerHTML = `${cabecalho('Contencioso e consultivo', 'Processos', estado.marca.recursos.datajud ? 'Andamentos dos tribunais chegam automaticamente (DataJud/CNJ).' : 'Para receber andamentos automáticos, configure a chave do DataJud.',
    ehGestor() && estado.marca.recursos.datajud ? `<button class="botao claro" type="button" id="sinc-todos">${icone('sincronizar')} Consultar tribunais agora</button>` : '')}
    <section class="cartao"><div class="barra-busca"><input id="busca" type="search" placeholder="Buscar por título, número ou cliente" aria-label="Buscar">
      <div class="filtros">${Object.entries(STATUS_PROCESSO).map(([k, [t]]) => `<button type="button" data-st="${k}" aria-pressed="${k === status}">${t}</button>`).join('')}</div></div>
      <div id="lista"></div><p class="suave pequeno">Novo processo: abra a ficha do cliente em <a href="#/clientes">Clientes</a>.</p></section>`;
  const carregar = async () => {
    const lista = await api('GET', `/escritorio/processos?status=${status}&busca=${encodeURIComponent($('#busca', c).value)}`);
    $('#lista', c).innerHTML = lista.length ? `<ul class="lista">${lista.map((p) => itemProcesso(p, '#/processo/')).join('')}</ul>` : vazio('Nenhum processo');
  };
  let t;
  $('#busca', c).addEventListener('input', () => { clearTimeout(t); t = setTimeout(carregar, 250); });
  $$('[data-st]', c).forEach((b) => b.addEventListener('click', () => {
    status = b.dataset.st;
    $$('[data-st]', c).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    carregar();
  }));
  $('#sinc-todos', c)?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try {
      const r = await api('POST', '/escritorio/gestor/sincronizar');
      avisar(`${r.processos} processos consultados, ${r.novos} andamentos novos${r.erros.length ? `, ${r.erros.length} com erro` : ''}.`);
      carregar();
    } catch (err) { avisar(err.message, 'erro'); } finally { ev.target.disabled = false; }
  });
  await carregar();
}

async function escProcesso(c, id) {
  const p = await api('GET', `/escritorio/processos/${encodeURIComponent(id)}`);
  const claude = estado.marca.recursos.claude;
  c.innerHTML = `<a class="voltar" href="#/cliente/${p.cliente_id}">${icone('voltar')} ${e(p.cliente_nome)}</a>
    ${cabecalho(nomeArea(p.area), e(p.titulo), `${e(p.numero_cnj || 'Sem número CNJ')}${p.tribunal ? ` · ${e(p.tribunal)}` : ''}${p.responsavel_nome ? ` · responsável: ${e(p.responsavel_nome)}` : ''}${p.sincronizado_em ? ` · tribunal consultado ${quando(p.sincronizado_em)}` : ''}`,
    `<select id="status-proc" aria-label="Situação">${Object.entries(STATUS_PROCESSO).map(([k, [t]]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${t}</option>`).join('')}</select>
     ${p.numero_cnj && estado.marca.recursos.datajud ? `<button class="botao claro" type="button" id="sinc">${icone('sincronizar')} Consultar tribunal</button>` : ''}`)}
    <div class="grade grade-2">
      <section class="cartao"><h2>Andamentos</h2><p class="suave pequeno">Pontilhado = nota interna (o cliente não vê).</p>${linhaDoTempo(p.andamentos, { interno: true })}</section>
      <form class="cartao" id="f-andamento"><h2>Lançar andamento</h2><br>
        <div class="campo"><label>Data</label><input name="data" type="date" value="${hojeIso()}" required></div>
        <div class="campo"><label>O que aconteceu</label><textarea name="descricao" rows="3" required placeholder="Ex.: Juntada de laudo pericial"></textarea></div>
        <div class="campo"><label>O que significa para o cliente</label><textarea name="explicacao" rows="3" placeholder="Linguagem simples, sem promessa de resultado."></textarea>
          ${claude ? `<button class="botao pequeno ouro" type="button" id="explicar-novo">${icone('claude')} Claude, explique</button>` : ''}</div>
        <label class="caixa-marcar"><input type="checkbox" name="visivel_cliente" value="1" checked><span>Mostrar ao cliente</span></label>
        <button class="botao" type="submit">Lançar</button>
      </form>
    </div>`;
  const form = $('#f-andamento', c);
  aoEnviar(form, async (d) => {
    await api('POST', `/escritorio/processos/${p.id}/andamentos`, { ...d, visivel_cliente: Boolean(d.visivel_cliente) });
    avisar('Andamento lançado.');
    rotear();
  });
  $('#explicar-novo', c)?.addEventListener('click', async (ev) => {
    const desc = form.descricao.value.trim();
    if (!desc) return avisar('Escreva primeiro o que aconteceu.', 'erro');
    ev.target.disabled = true;
    try { form.explicacao.value = (await api('POST', `/escritorio/processos/${p.id}/explicar`, { descricao: desc })).texto; } catch (err) { avisar(err.message, 'erro'); } finally { ev.target.disabled = false; }
  });
  $('#status-proc', c).addEventListener('change', async (ev) => {
    try { await api('PATCH', `/escritorio/processos/${p.id}`, { status: ev.target.value }); avisar('Situação atualizada.'); } catch (err) { avisar(err.message, 'erro'); }
  });
  $('#sinc', c)?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try { const r = await api('POST', `/escritorio/processos/${p.id}/sincronizar`); avisar(`${r.novos} andamentos novos do tribunal.`); rotear(); } catch (err) { avisar(err.message, 'erro'); ev.target.disabled = false; }
  });
  c.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    const li = b.closest('[data-andamento]');
    const a = p.andamentos.find((x) => String(x.id) === li.dataset.andamento);
    if (b.dataset.acao === 'visibilidade') {
      await api('PATCH', `/escritorio/andamentos/${a.id}`, { visivel_cliente: !a.visivel_cliente });
      return rotear();
    }
    abrirModal('Explicação para o cliente', `<form><p class="suave pequeno">${e(a.descricao)}</p>
      <div class="campo"><label>O que significa</label><textarea name="explicacao" rows="4">${e(a.explicacao || '')}</textarea></div>
      <div class="acoes"><button class="botao" type="submit">Salvar</button>${claude ? `<button class="botao claro" type="button" id="sugerir-exp">${icone('claude')} Sugerir com Claude</button>` : ''}</div></form>`, async (_f, d) => {
      await api('PATCH', `/escritorio/andamentos/${a.id}`, d);
      avisar('Explicação salva.');
      rotear();
    });
    $('#sugerir-exp')?.addEventListener('click', async (e2) => {
      e2.target.disabled = true;
      try { $('#modal textarea').value = (await api('POST', `/escritorio/processos/${p.id}/explicar`, { descricao: a.descricao })).texto; } catch (err) { avisar(err.message, 'erro'); } finally { e2.target.disabled = false; }
    });
  });
}

async function escMensagens(c, clienteId) {
  const caixa = await api('GET', '/escritorio/mensagens');
  c.innerHTML = `${cabecalho('Atendimento', 'Mensagens', 'Conversas com os clientes. O Claude pode sugerir a resposta; quem envia é sempre uma pessoa do escritório.')}
    <div class="caixa-entrada ${clienteId ? 'com-conversa' : ''}">
      <section class="cartao lista-conversas">${caixa.length ? `<ul class="lista">${caixa.map((x) => `<li data-cliente="${x.cliente_id}" ${String(x.cliente_id) === String(clienteId) ? 'aria-current="true"' : ''}>
        <div class="item"><div class="titulo">${e(x.cliente_nome)}</div><div class="meta">${x.ultima_do_escritorio ? 'Você: ' : ''}${e(x.ultima_mensagem.slice(0, 80))}</div><div class="meta pequeno">${quando(x.ultima_em)}</div></div>
        ${x.nao_lidas ? '<span class="ponto" aria-label="não lida"></span>' : ''}</li>`).join('')}</ul>` : vazio('Nenhuma conversa ainda', 'Abra a ficha de um cliente para iniciar.')}</section>
      <section class="cartao painel-conversa" id="painel">${clienteId ? '' : vazio('Escolha uma conversa')}</section>
    </div>`;
  $$('[data-cliente]', c).forEach((li) => li.addEventListener('click', () => navegar(`#/mensagens/${li.dataset.cliente}`)));
  if (!clienteId) return;
  const cid = encodeURIComponent(clienteId);
  const claude = estado.marca.recursos.claude;
  const painel = $('#painel', c);
  const alvo = document.createElement('div');
  painel.append(alvo);
  const nome = caixa.find((x) => String(x.cliente_id) === String(clienteId))?.cliente_nome;
  painel.insertAdjacentHTML('afterbegin', `<div class="cartao-titulo"><div><a class="voltar" href="#/mensagens">${icone('voltar')} Conversas</a><h2>${e(nome || 'Conversa')}</h2></div><a class="pequeno" href="#/cliente/${cid}">Ficha do cliente</a></div>`);
  const form = montarConversa(alvo, {
    carregar: () => api('GET', `/escritorio/mensagens/${cid}`),
    enviar: (texto) => api('POST', `/escritorio/mensagens/${cid}`, { texto }),
    souEscritorio: true,
    extraAcoes: claude ? `<button class="botao claro" type="button" id="sugerir" title="O Claude redige; você revisa e envia">${icone('claude')}<span class="esconde-movel">Sugerir</span></button>` : '',
  });
  $('#sugerir', c)?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    b.disabled = true;
    try {
      form.texto.value = (await api('POST', `/escritorio/mensagens/${cid}/sugestao`)).texto;
      form.texto.focus();
      avisar('Rascunho pronto. Revise antes de enviar.');
    } catch (err) { avisar(err.message, 'erro'); } finally { b.disabled = false; }
  });
  setTimeout(atualizarContadores, 600);
}

async function escFinanceiro(c) {
  let situacao = '';
  const inad = await api('GET', '/escritorio/inadimplentes');
  c.innerHTML = `${cabecalho('Honorários', 'Financeiro', 'Quem está pagando, quem deixou de pagar e o que vence a seguir.')}
    ${inad.length ? `<section class="cartao"><h2>Inadimplentes</h2><br><div class="tabela-envolve"><table><thead><tr><th>Cliente</th><th class="num">Parcelas</th><th class="num">Total</th><th>Desde</th><th></th></tr></thead><tbody>
      ${inad.map((x) => `<tr><td><a href="#/cliente/${x.cliente_id}"><strong>${e(x.nome)}</strong></a><div class="suave pequeno">${e(x.telefone || x.email)}</div></td><td class="num">${x.parcelas_atrasadas}</td>
        <td class="num"><span class="selo perigo">${reais(x.total_centavos)}</span></td><td>${dataBr(x.desde)}</td>
        <td class="num"><a class="botao pequeno claro" href="#/mensagens/${x.cliente_id}">Cobrar</a></td></tr>`).join('')}</tbody></table></div></section>` : ''}
    <section class="cartao"><div class="barra-busca"><div class="filtros">${[['', 'Todas'], ['atrasada', 'Atrasadas'], ['a_vencer', 'A vencer'], ['paga', 'Pagas'], ['cancelada', 'Canceladas']].map(([k, t]) => `<button type="button" data-sit="${k}" aria-pressed="${k === situacao}">${t}</button>`).join('')}</div></div>
      <div id="lista"></div><p class="suave pequeno">Nova cobrança: abra a ficha do cliente, aba Financeiro.</p></section>`;
  const carregar = async () => { $('#lista', c).innerHTML = tabelaCobrancas(await api('GET', `/escritorio/cobrancas${situacao ? `?situacao=${situacao}` : ''}`), true); };
  $$('[data-sit]', c).forEach((b) => b.addEventListener('click', () => {
    situacao = b.dataset.sit;
    $$('[data-sit]', c).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    carregar();
  }));
  ligarCobrancas(c);
  await carregar();
}

async function escSolicitacoes(c) {
  const lista = await api('GET', '/escritorio/solicitacoes');
  c.innerHTML = `${cabecalho('Novos casos', 'Solicitações', 'Pedidos de análise enviados pelos clientes no aplicativo.')}
    <section class="cartao">${listaSolicitacoes(lista, true)}</section>`;
  ligarSolicitacoes(c);
}

async function escEquipe(c) {
  const [equipe, auditoria] = await Promise.all([api('GET', '/escritorio/equipe'), api('GET', '/escritorio/gestor/auditoria')]);
  c.innerHTML = `${cabecalho('Controle de acesso', 'Equipe', 'Você é o único gestor. Inclua e retire estagiários e colaboradores quando quiser.', `<button class="botao" type="button" id="novo-membro">${icone('mais')} Incluir pessoa</button>`)}
    <section class="cartao"><ul class="lista">${equipe.map((p) => `<li data-pessoa="${p.id}"><div><div class="titulo">${e(p.nome)} ${p.papel === 'gestor' ? '<span class="selo ouro">gestor</span>' : ''} ${p.ativo ? '' : '<span class="selo">sem acesso</span>'}</div>
      <div class="meta">${e(p.email)} · último acesso: ${p.ultimo_acesso ? quando(p.ultimo_acesso) : 'nunca'}</div></div>
      ${p.papel === 'gestor' ? '' : `<div class="acoes"><button class="botao pequeno claro" type="button" data-reset>Nova senha</button><button class="botao pequeno ${p.ativo ? 'perigo' : 'claro'}" type="button" data-alternar>${p.ativo ? 'Retirar acesso' : 'Devolver acesso'}</button></div>`}</li>`).join('')}</ul></section>
    <section class="cartao"><h2>Registro de atividades</h2><p class="suave pequeno">Tudo o que é feito no sistema — inclusive pelo Claude — fica registrado.</p>
      <div class="tabela-envolve"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>
      ${auditoria.slice(0, 80).map((a) => `<tr><td class="suave pequeno">${quando(a.criado_em)}</td><td>${e(a.usuario_nome || (a.origem === 'automacao' ? 'Automação' : '—'))}${a.origem === 'claude' ? ' <span class="selo ouro">Claude</span>' : ''}</td><td class="pequeno">${e(a.acao)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  $('#novo-membro', c).addEventListener('click', () => abrirModal('Incluir na equipe', `<form>
      <div class="campo"><label>Nome</label><input name="nome" type="text" required></div>
      <div class="campo"><label>E-mail</label><input name="email" type="email" required></div>
      <div class="campo"><label>Senha provisória</label><input name="senha" type="text" minlength="8" required value="${e(senhaAleatoria())}"></div>
      <p class="suave pequeno">A equipe vê clientes, processos, mensagens e financeiro. Só você inclui ou retira pessoas.</p>
      <button class="botao" type="submit">Incluir</button></form>`, async (_f, d) => {
    await api('POST', '/escritorio/gestor/equipe', d);
    avisar('Pessoa incluída. Envie a ela o e-mail e a senha provisória.');
    rotear();
  }));
  c.addEventListener('click', async (ev) => {
    const li = ev.target.closest('[data-pessoa]');
    if (!li) return;
    const pessoa = equipe.find((x) => String(x.id) === li.dataset.pessoa);
    if (ev.target.closest('[data-reset]')) return redefinirSenha(pessoa);
    if (ev.target.closest('[data-alternar]')) {
      if (pessoa.ativo && !confirm(`Retirar o acesso de ${pessoa.nome}?`)) return;
      await api('POST', `/escritorio/gestor/acesso/${pessoa.id}`, { ativo: !pessoa.ativo });
      avisar('Acesso atualizado.');
      rotear();
    }
  });
}

async function escAssistente(c) {
  const ligado = estado.marca.recursos.claude;
  let historico = [];
  try { historico = JSON.parse(sessionStorage.getItem('aguillera-assistente') || '[]'); } catch { historico = []; }
  c.innerHTML = `${cabecalho('Gestão por conversa', 'Claude', 'Peça em português. O Claude consulta o sistema, lança andamentos e cobranças e redige mensagens para você revisar.',
    historico.length ? '<button class="botao claro pequeno" type="button" id="nova-conversa">Nova conversa</button>' : '')}
    ${ligado ? '' : '<section class="cartao destaque-ouro"><p><strong>O Claude ainda não está conectado.</strong> Peça ao gestor para preencher <code>ANTHROPIC_API_KEY</code> no arquivo <code>.env</code> do servidor (veja o README).</p></section>'}
    <section class="cartao assistente"><div class="sugestoes">${['Quem está inadimplente e quanto deve?', 'Resuma as mensagens sem resposta', 'Quais processos tiveram andamento esta semana?', 'Quanto recebemos este mês?', 'Quais pedidos novos chegaram?']
    .map((s) => `<button type="button" data-sug>${e(s)}</button>`).join('')}</div>
      <div class="conversa"><div class="bolhas" id="bolhas" aria-live="polite"></div>
        <form class="compor" id="f-claude"><label class="sr" for="pedido">Pedido</label><textarea id="pedido" name="texto" rows="2" placeholder="Ex.: Lança no processo da Maria que a perícia foi marcada para 12/11" required ${ligado ? '' : 'disabled'}></textarea>
          <button class="botao ouro" type="submit" ${ligado ? '' : 'disabled'}>${icone('enviar')}<span class="esconde-movel">Pedir</span></button></form></div></section>`;
  const bolhas = $('#bolhas', c);
  const desenhar = (pensando) => {
    bolhas.innerHTML = historico.map((m) => `<div class="bolha ${m.papel === 'usuario' ? 'minha' : 'outra'}">${m.papel === 'usuario' ? e(m.texto) : textoRico(m.texto)}</div>`).join('')
      + (pensando ? '<div class="bolha outra"><span class="digitando"><i></i><i></i><i></i></span> consultando o escritório…</div>' : '')
      || vazio('Como posso ajudar?', 'Escolha uma sugestão acima ou escreva o seu pedido.');
    bolhas.scrollTop = bolhas.scrollHeight;
  };
  desenhar(false);
  const form = $('#f-claude', c);
  const enviar = async (texto) => {
    historico.push({ papel: 'usuario', texto });
    desenhar(true);
    try {
      const r = await api('POST', '/escritorio/assistente', { historico });
      historico.push({ papel: 'assistente', texto: r.texto || '(sem resposta)' });
    } catch (err) {
      historico.pop();
      avisar(err.message, 'erro');
      form.texto.value = texto;
    }
    try { sessionStorage.setItem('aguillera-assistente', JSON.stringify(historico.slice(-30))); } catch { /* sem armazenamento */ }
    desenhar(false);
  };
  aoEnviar(form, async (d) => { form.reset(); await enviar(d.texto.trim()); });
  form.texto.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); form.requestSubmit(); } });
  $$('[data-sug]', c).forEach((b) => b.addEventListener('click', () => { if (ligado) enviar(b.textContent); }));
  $('#nova-conversa', c)?.addEventListener('click', () => { historico = []; sessionStorage.removeItem('aguillera-assistente'); rotear(); });
}

// ====================================================================== início
async function iniciar() {
  try {
    const [marca, eu] = await Promise.all([api('GET', '/marca'), api('GET', '/eu')]);
    estado.marca = marca;
    estado.usuario = eu.usuario;
    document.title = `${marca.marca.nome} — ${eu.usuario && ['gestor', 'equipe'].includes(eu.usuario.papel) ? 'Escritório' : 'Portal do Cliente'}`;
  } catch (err) {
    $('#app').innerHTML = `<div class="carregando"><div class="vazio"><h3>Sem conexão</h3><p>${e(err.message)}</p></div></div>`;
    return;
  }
  rotear();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
iniciar();
