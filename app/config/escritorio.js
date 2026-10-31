/* ==========================================================================
   IDENTIDADE DO ESCRITÓRIO — o único arquivo que muda de um escritório para
   outro. Para licenciar o aplicativo a outro advogado, troque este arquivo
   (nome, cores, contatos, redes, áreas) e nada mais no código.

   É público: vai para o navegador. NÃO coloque senhas ou chaves aqui — elas
   ficam no arquivo .env (veja .env.example).
   ========================================================================== */

export default {
  marca: {
    nome: 'Aguillera',
    nomeCompleto: 'Jocsan Aguillera Advocacia',
    assinatura: 'Entender o objetivo. Buscá-lo com efetividade.',
    // Paleta da marca (a mesma do site).
    cores: {
      verdeEscuro: '#06281F',
      verde: '#0B3D2E',
      verdeMedio: '#14513D',
      ouro: '#C8A84E',
      ouroEscuro: '#7A5F1E',
      offWhite: '#F6F3EA',
      pedra: '#EDE8DA',
    },
  },

  advogado: {
    nome: 'Jocsan Aguillera',
    oab: 'OAB/MS nº 18.115',
  },

  contato: {
    whatsapp: '5567998325997',
    whatsappExibicao: '(67) 99832-5997',
    email: 'advogadoaguillera@gmail.com',
    endereco: 'Rua Firmo de Matos, 1464 — Centro, Corumbá/MS',
    horario: '',
  },

  // Campos vazios não aparecem no aplicativo.
  links: {
    site: '',        // ex.: 'https://www.advocaciadaterra.com.br'
    instagram: '',   // ex.: 'https://instagram.com/seuperfil'
    facebook: '',
    linkedin: '',
    youtube: '',
  },

  // Dados de pagamento exibidos ao cliente junto de cada cobrança.
  pagamento: {
    chavePix: '',            // ex.: CPF, CNPJ, e-mail ou chave aleatória
    favorecido: 'Jocsan Aguillera',
    instrucoes: 'Após o pagamento, envie o comprovante pela aba Mensagens.',
  },

  // Áreas de atuação — alimentam o catálogo de serviços e o cadastro.
  areas: [
    { id: 'imobiliario', nome: 'Imobiliário e fundiário', descricao: 'Regularização de imóveis, usucapião, compra segura, conflitos de posse e propriedade rural.' },
    { id: 'civel', nome: 'Cível e imóvel urbano', descricao: 'Compra e financiamento, atraso de construtora, locação, contratos e indenizações.' },
    { id: 'criminal', nome: 'Defesa criminal', descricao: 'Defesa em inquérito e ação penal, habeas corpus, drogas e cannabis medicinal.' },
    { id: 'previdenciario', nome: 'Previdenciário', descricao: 'INSS, aposentadorias, BPC/LOAS, segurado especial rural e revisões de benefício.' },
    { id: 'tributario', nome: 'Tributário', descricao: 'Execução fiscal, autos de infração, tributação do agro e do patrimônio.' },
    { id: 'empresarial', nome: 'Empresarial', descricao: 'Sociedades, contratos empresariais, conflitos societários e holding patrimonial.' },
  ],
};
