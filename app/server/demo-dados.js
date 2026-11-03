// Clientes, processos, cobranças e mensagens fictícios para conhecer o aplicativo.
// Usado por `npm run demo` (no computador) e pela versão de teste no Cloudflare (DEMO=1).
// Só roda num banco sem clientes: nunca mistura com dados reais.

import { db } from './banco.js';
import { criarUsuario } from './auth.js';
import * as n from './nucleo.js';

export async function semearDemo() {
  if (await db().get("SELECT 1 FROM usuarios WHERE papel = 'cliente'")) return false;
  const gestor = await db().get("SELECT id FROM usuarios WHERE papel = 'gestor'");
  if (!gestor) return false;
  const dia = (delta) => n.hoje(delta);

  const ana = await criarUsuario({ nome: 'Ana Ribeiro', email: 'ana@demo.br', senha: 'demo-equipe', papel: 'equipe' });
  await criarUsuario({ nome: 'Bruno Campos', email: 'bruno@demo.br', senha: 'demo-equipe', papel: 'equipe' });

  const cli = (nome, email, area, extra = {}) => criarUsuario({ nome, email, senha: 'demo-cliente', papel: 'cliente', area_interesse: area, consentimento: true, ...extra });
  const maria = await cli('Maria Aparecida Souza', 'maria@demo.br', 'previdenciario', { telefone: '(67) 99999-0001' });
  const jose = await cli('José Carlos Pereira', 'jose@demo.br', 'imobiliario', { telefone: '(67) 99999-0002' });
  const lucia = await cli('Lúcia Fernandes', 'lucia@demo.br', 'civel', { telefone: '(67) 99999-0003', origem: 'site-civel' });
  const pedro = await cli('Pedro Henrique Alves', 'pedro@demo.br', 'criminal', { origem: 'site-criminal' });
  // Distribui as datas de cadastro nos últimos meses (para o gráfico do painel).
  for (const [u, d] of [[maria, 140], [jose, 95], [lucia, 40], [pedro, 6]]) {
    await db().run("UPDATE usuarios SET criado_em = datetime('now', ?) WHERE id = ?", `-${d} days`, u.id);
  }

  const p1 = await n.criarProcesso({ cliente_id: maria.id, titulo: 'Aposentadoria por idade — segurada especial rural', area: 'previdenciario', numero_cnj: '0801234-56.2025.8.12.0008', tribunal: '1ª Vara Cível de Corumbá', responsavel_id: ana.id }, gestor.id);
  await n.registrarAndamento(p1.id, { data: dia(-60), descricao: 'Petição inicial distribuída', explicacao: 'O seu pedido de aposentadoria foi apresentado à Justiça.' }, ana.id);
  await n.registrarAndamento(p1.id, { data: dia(-32), descricao: 'Citação do INSS', explicacao: 'O INSS foi oficialmente avisado do processo e terá prazo para responder.' }, ana.id);
  await n.registrarAndamento(p1.id, { data: dia(-9), descricao: 'Designada audiência de instrução', explicacao: 'Foi marcada a audiência em que as testemunhas confirmam o trabalho rural. Vamos combinar os detalhes com você.' }, gestor.id);
  await n.registrarAndamento(p1.id, { data: dia(-8), descricao: 'Pendente: confirmar endereço das testemunhas', visivel_cliente: false }, ana.id);

  const p2 = await n.criarProcesso({ cliente_id: jose.id, titulo: 'Usucapião extraordinária — Fazenda Boa Vista', area: 'imobiliario', numero_cnj: '0805555-11.2024.8.12.0008', tribunal: '2ª Vara Cível de Corumbá' }, gestor.id);
  await n.registrarAndamento(p2.id, { data: dia(-120), descricao: 'Petição inicial distribuída' }, gestor.id);
  await n.registrarAndamento(p2.id, { data: dia(-3), descricao: 'Juntada de laudo pericial', explicacao: 'O perito apresentou o levantamento da área. Estamos analisando o laudo.', origem: 'datajud' }, null);

  const p3 = await n.criarProcesso({ cliente_id: lucia.id, titulo: 'Atraso na entrega do imóvel — Residencial Pantanal', area: 'civel' }, gestor.id);
  await n.registrarAndamento(p3.id, { data: dia(-15), descricao: 'Notificação extrajudicial enviada à construtora' }, ana.id);

  for (const c of (await n.criarCobrancas({ cliente_id: maria.id, descricao: 'Honorários iniciais', valor: '1.500,00', vencimento: dia(-75), parcelas: 3 }, gestor.id)).slice(0, 2)) {
    await n.alterarCobranca(c.id, { status: 'paga', pago_em: c.vencimento }, gestor.id);
  }
  for (const c of (await n.criarCobrancas({ cliente_id: jose.id, descricao: 'Honorários contratuais — usucapião', valor: '12.000,00', vencimento: dia(-50), parcelas: 6 }, gestor.id)).slice(0, 1)) {
    await n.alterarCobranca(c.id, { status: 'paga', pago_em: n.hoje() }, gestor.id);
  }
  await n.criarCobrancas({ cliente_id: lucia.id, descricao: 'Honorários — notificação e acordo', valor: '2.400,00', vencimento: dia(4), parcelas: 2 }, gestor.id);

  await n.enviarMensagem(maria.id, maria.id, 'Bom dia, doutor! Recebi a notícia da audiência. Preciso levar algum documento?', false);
  await n.enviarMensagem(maria.id, ana.id, 'Bom dia, dona Maria! Vamos te enviar a lista certinha até sexta.', true);
  await n.enviarMensagem(maria.id, maria.id, 'Obrigada! E as testemunhas, precisam ir comigo?', false);
  await n.enviarMensagem(jose.id, jose.id, 'O laudo saiu? Ficou bom pra gente?', false);

  await n.criarSolicitacao(pedro.id, { area: 'criminal', assunto: 'Meu irmão foi preso em flagrante', descricao: 'Foi ontem à noite, em Ladário. Precisamos de orientação urgente sobre audiência de custódia.' });
  await n.criarSolicitacao(lucia.id, { area: 'civel', assunto: 'Revisão do contrato de financiamento', descricao: 'Quero saber se os juros do meu financiamento estão corretos.' });

  // Algumas visitas ao site nos últimos dias, para a aba "Site" não abrir vazia.
  const visitas = [['/', 'Google', 9, 6], ['/advocacia-civil/', 'Google', 7, 4], ['/advogado-criminal-drogas/', 'Instagram', 5, 4], ['/livros/', 'direto', 3, 1], ['/', 'WhatsApp', 4, 3]];
  for (let d = 0; d < 10; d++) {
    for (const [pagina, fonte, vistas, visitantes] of visitas) {
      await db().run('INSERT OR IGNORE INTO visitas (dia, pagina, fonte, vistas, visitantes) VALUES (?, ?, ?, ?, ?)',
        dia(-d), pagina, fonte, Math.max(1, vistas - (d % 4)), Math.max(0, visitantes - (d % 3)));
    }
  }
  return true;
}
