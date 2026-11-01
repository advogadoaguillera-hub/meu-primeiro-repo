// Dados de demonstração para conhecer o aplicativo sem tocar no banco real.
// Uso: npm run demo   → cria data/demo.db e sobe o app com ele.
// Todos os nomes e números são fictícios.

process.env.DB_PATH = process.env.DB_PATH || 'data/demo.db';
process.env.UPLOADS_DIR = process.env.UPLOADS_DIR || 'data/demo-arquivos';

const { abrirBanco } = await import('./db.js');
const { criarUsuario } = await import('./auth.js');
const n = await import('./nucleo.js');

const db = abrirBanco();
const ja = db.prepare("SELECT 1 FROM usuarios WHERE papel = 'gestor'").get();

if (!ja) {
  const dia = (delta) => new Date(Date.now() + delta * 86_400_000).toISOString().slice(0, 10);
  const gestor = criarUsuario({ nome: 'Jocsan Aguillera', email: 'gestor@demo.br', senha: 'demo-gestor', papel: 'gestor' });
  const ana = criarUsuario({ nome: 'Ana Ribeiro', email: 'ana@demo.br', senha: 'demo-equipe', papel: 'equipe' });
  criarUsuario({ nome: 'Bruno Campos', email: 'bruno@demo.br', senha: 'demo-equipe', papel: 'equipe' });

  const cli = (nome, email, area, extra = {}) => criarUsuario({ nome, email, senha: 'demo-cliente', papel: 'cliente', area_interesse: area, consentimento: true, ...extra });
  const maria = cli('Maria Aparecida Souza', 'maria@demo.br', 'previdenciario', { telefone: '(67) 99999-0001' });
  const jose = cli('José Carlos Pereira', 'jose@demo.br', 'imobiliario', { telefone: '(67) 99999-0002' });
  const lucia = cli('Lúcia Fernandes', 'lucia@demo.br', 'civel', { telefone: '(67) 99999-0003' });
  const pedro = cli('Pedro Henrique Alves', 'pedro@demo.br', 'criminal');
  // Distribui as datas de cadastro nos últimos meses (para o gráfico do painel).
  [[maria, 140], [jose, 95], [lucia, 40], [pedro, 6]].forEach(([u, d]) =>
    db.prepare("UPDATE usuarios SET criado_em = datetime('now', ?) WHERE id = ?").run(`-${d} days`, u.id));

  const p1 = n.criarProcesso({ cliente_id: maria.id, titulo: 'Aposentadoria por idade — segurada especial rural', area: 'previdenciario', numero_cnj: '0801234-56.2025.8.12.0008', tribunal: '1ª Vara Cível de Corumbá', responsavel_id: ana.id }, gestor.id);
  n.registrarAndamento(p1.id, { data: dia(-60), descricao: 'Petição inicial distribuída', explicacao: 'O seu pedido de aposentadoria foi apresentado à Justiça.' }, ana.id);
  n.registrarAndamento(p1.id, { data: dia(-32), descricao: 'Citação do INSS', explicacao: 'O INSS foi oficialmente avisado do processo e terá prazo para responder.' }, ana.id);
  n.registrarAndamento(p1.id, { data: dia(-9), descricao: 'Designada audiência de instrução', explicacao: 'Foi marcada a audiência em que as testemunhas confirmam o trabalho rural. Vamos combinar os detalhes com você.' }, gestor.id);
  n.registrarAndamento(p1.id, { data: dia(-8), descricao: 'Pendente: confirmar endereço das testemunhas', visivel_cliente: false }, ana.id);

  const p2 = n.criarProcesso({ cliente_id: jose.id, titulo: 'Usucapião extraordinária — Fazenda Boa Vista', area: 'imobiliario', numero_cnj: '0805555-11.2024.8.12.0008', tribunal: '2ª Vara Cível de Corumbá' }, gestor.id);
  n.registrarAndamento(p2.id, { data: dia(-120), descricao: 'Petição inicial distribuída' }, gestor.id);
  n.registrarAndamento(p2.id, { data: dia(-3), descricao: 'Juntada de laudo pericial', explicacao: 'O perito apresentou o levantamento da área. Estamos analisando o laudo.', origem: 'datajud' }, null);

  const p3 = n.criarProcesso({ cliente_id: lucia.id, titulo: 'Atraso na entrega do imóvel — Residencial Pantanal', area: 'civel' }, gestor.id);
  n.registrarAndamento(p3.id, { data: dia(-15), descricao: 'Notificação extrajudicial enviada à construtora' }, ana.id);

  n.criarCobrancas({ cliente_id: maria.id, descricao: 'Honorários iniciais', valor: '1.500,00', vencimento: dia(-75), parcelas: 3 }, gestor.id);
  n.listarCobrancas({ clienteId: maria.id }).slice(0, 2).forEach((c) => n.alterarCobranca(c.id, { status: 'paga', pago_em: c.vencimento }, gestor.id));
  n.criarCobrancas({ cliente_id: jose.id, descricao: 'Honorários contratuais — usucapião', valor: '12.000,00', vencimento: dia(-50), parcelas: 6 }, gestor.id);
  n.listarCobrancas({ clienteId: jose.id }).slice(0, 1).forEach((c) => n.alterarCobranca(c.id, { status: 'paga', pago_em: n.hoje() }, gestor.id));
  n.criarCobrancas({ cliente_id: lucia.id, descricao: 'Honorários — notificação e acordo', valor: '2.400,00', vencimento: dia(4), parcelas: 2 }, gestor.id);

  n.enviarMensagem(maria.id, maria.id, 'Bom dia, doutor! Recebi a notícia da audiência. Preciso levar algum documento?', false);
  n.enviarMensagem(maria.id, ana.id, 'Bom dia, dona Maria! Vamos te enviar a lista certinha até sexta.', true);
  n.enviarMensagem(maria.id, maria.id, 'Obrigada! E as testemunhas, precisam ir comigo?', false);
  n.enviarMensagem(jose.id, jose.id, 'O laudo saiu? Ficou bom pra gente?', false);

  n.criarSolicitacao(pedro.id, { area: 'criminal', assunto: 'Meu irmão foi preso em flagrante', descricao: 'Foi ontem à noite, em Ladário. Precisamos de orientação urgente sobre audiência de custódia.' });
  n.criarSolicitacao(lucia.id, { area: 'civel', assunto: 'Revisão do contrato de financiamento', descricao: 'Quero saber se os juros do meu financiamento estão corretos.' });

  console.log('Dados de demonstração criados.');
}

console.log(`
Acessos de demonstração:
  Gestor ........ gestor@demo.br  / demo-gestor
  Estagiária .... ana@demo.br     / demo-equipe
  Cliente ....... maria@demo.br   / demo-cliente
`);

if (!process.argv.includes('--sem-servidor')) {
  const { criarApp } = await import('./app.js');
  const porta = Number(process.env.PORT || 3000);
  criarApp().listen(porta, () => console.log(`Demonstração no ar: http://localhost:${porta}`));
}
