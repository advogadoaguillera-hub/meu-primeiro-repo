// Demonstração no computador, sem tocar no banco real: `npm run demo`.
// Cria data/demo.db com dados fictícios e sobe o app com ele.

process.env.DB_PATH = process.env.DB_PATH || 'data/demo.db';
process.env.UPLOADS_DIR = process.env.UPLOADS_DIR || 'data/demo-arquivos';
process.env.GESTOR_NOME = 'Jocsan Aguillera';
process.env.GESTOR_EMAIL = 'gestor@demo.br';
process.env.GESTOR_SENHA = 'demo-gestor';

const { montarNode, iniciarServidor } = await import('./node.js');
const { garantirGestor } = await import('./inicio.js');
const { semearDemo } = await import('./demo-dados.js');

const app = await montarNode(process.env);
await garantirGestor();
if (await semearDemo()) console.log('Dados de demonstração criados.');

console.log(`
Acessos de demonstração:
  Gestor ........ gestor@demo.br  / demo-gestor
  Estagiária .... ana@demo.br     / demo-equipe
  Cliente ....... maria@demo.br   / demo-cliente
`);

if (!process.argv.includes('--sem-servidor')) {
  const porta = Number(process.env.PORT || 3000);
  iniciarServidor(app, porta).once('listening', () => console.log(`Demonstração no ar: http://localhost:${porta}`));
}
