/* ==========================================================================
   CONFIGURAÇÃO DO SITE — Jocsan Aguillera | Defesa Criminal Estratégica
   --------------------------------------------------------------------------
   Este é o ÚNICO arquivo que precisa ser editado para atualizar dados de
   contato, credenciais, redes e integrações.

   Campos com valor "" (vazio) ficam automaticamente OCULTOS no site.
   Basta preencher para que apareçam.

   NÃO coloque tokens, senhas ou chaves secretas aqui — este arquivo é público.
   ========================================================================== */

window.SITE_CONFIG = {

  /* ---------------------------------------------------------------------
     1. IDENTIFICAÇÃO PROFISSIONAL
     --------------------------------------------------------------------- */
  advogado: {
    nome: 'Jocsan Aguillera',
    titulo: 'Advogado',
    oab: 'OAB/MS nº 18.115',

    // Tempo de experiência exibido em texto. Atualize quando desejar.
    experiencia: 'aproximadamente 12 anos',
  },

  marca: {
    nome: 'Jocsan Aguillera Advocacia',
    descritor: 'Defesa Criminal Estratégica',
  },

  /* ---------------------------------------------------------------------
     2. CONTATO
     --------------------------------------------------------------------- */
  contato: {
    // Número no formato internacional, apenas dígitos (55 + DDD + número).
    whatsapp: '5567998325997',
    whatsappExibicao: '(67) 99832-5997',

    email: 'advogadoaguillera@gmail.com',

    // Mesmo número do WhatsApp — aparece também como "Telefone" para quem
    // prefere ligar em vez de mandar mensagem.
    telefoneFixo: '(67) 99832-5997',

    endereco: 'Rua Firmo de Matos, 1464',
    complemento: '',         // ex.: 'Sala 4'
    cidade: 'Corumbá',
    estado: 'MS',
    cep: '',                 // <- PREENCHER
    horarioAtendimento: '',  // ex.: 'Segunda a sexta, 8h às 18h'

    // Atendimento de urgência (prisão em flagrante / custódia).
    // Deixe vazio se não quiser divulgar disponibilidade estendida.
    urgencia: '',            // ex.: 'Plantão para situações de urgência'
  },

  /* ---------------------------------------------------------------------
     3. REDES SOCIAIS — deixe vazio o que não existir
     --------------------------------------------------------------------- */
  redes: {
    instagram: '',
    linkedin: '',
    youtube: '',
    spotify: '',
  },

  /* ---------------------------------------------------------------------
     4. MENSAGEM PADRÃO DO WHATSAPP
     Sóbria e institucional, sem promessa de resultado.
     --------------------------------------------------------------------- */
  mensagemWhatsapp:
    'Olá, gostaria de conversar sobre uma questão jurídica criminal.',

  /* ---------------------------------------------------------------------
     5. FORMULÁRIO
     'whatsapp' -> monta a mensagem e abre o WhatsApp (não exige servidor)
     'email'    -> abre o programa de e-mail do visitante
     'endpoint' -> envia para um serviço externo (Formspree, Basin, etc.)
     --------------------------------------------------------------------- */
  formulario: {
    destino: 'whatsapp',
    endpoint: '',   // usado apenas quando destino === 'endpoint'
  },

  /* ---------------------------------------------------------------------
     6. DOMÍNIO — preencher quando o domínio definitivo existir.
     Usado em canonical, Open Graph e sitemap.
     --------------------------------------------------------------------- */
  site: {
    url: '',  // ex.: 'https://www.jocsanaguillera.adv.br'
  },

  /* ---------------------------------------------------------------------
     7. ANALYTICS / PIXEL (opcional)
     Vazio = nenhum script de terceiros é carregado. Site mais rápido e
     sem cookies desnecessários.
     --------------------------------------------------------------------- */
  analytics: {
    googleTagManagerId: '',
    googleAnalyticsId: '',
    metaPixelId: '',
  },

  /* ---------------------------------------------------------------------
     8. IDIOMAS DE ATENDIMENTO
     Marque como `true` apenas o que estiver efetivamente disponível.
     O site exibe somente os idiomas marcados como true.
     --------------------------------------------------------------------- */
  idiomas: [
    { nome: 'Português', ativo: true },
    { nome: 'Inglês',    ativo: true },
    { nome: 'Espanhol',  ativo: true },
    { nome: 'Alemão',    ativo: true },
    { nome: 'Árabe',     ativo: true },
  ],

  /* ---------------------------------------------------------------------
     9. FORMAÇÃO E CREDENCIAIS
     ATENÇÃO: preencha apenas com informação verificável e documentada.
     Itens com `instituicao` ou `ano` vazios aparecem sem esses dados —
     nunca invente instituição, ano ou título.
     --------------------------------------------------------------------- */
  formacao: [
    {
      titulo: 'Pós-graduação em Direito Civil',
      instituicao: '',   // <- PREENCHER
      ano: '',           // <- PREENCHER
    },
    {
      titulo: 'Pós-graduação em Processo Civil',
      instituicao: '',   // <- PREENCHER
      ano: '',           // <- PREENCHER
    },
    {
      // ATENÇÃO — ver README, item "Conformidade OAB".
      // O site usa "Formação em Direito Médico". A palavra "Especialista"
      // só pode ser anunciada quando houver título de pós-graduação ou
      // certificação reconhecida pela OAB. Se existir o título, troque o
      // texto abaixo e preencha instituição e ano.
      titulo: 'Formação em Direito Médico',
      instituicao: '',   // <- PREENCHER
      ano: '',           // <- PREENCHER
    },
    {
      titulo: 'Curso de Agronomia na prática',
      instituicao: '',   // <- PREENCHER
      ano: '',           // <- PREENCHER
    },
  ],

  /* ---------------------------------------------------------------------
     10. FOTOGRAFIAS
     Coloque os arquivos em assets/img/ e informe o nome aqui.
     Vazio = o site exibe um espaço gráfico elegante no lugar.
     --------------------------------------------------------------------- */
  imagens: {
    retrato: '',        // ex.: 'jocsan-retrato.webp'
    escritorio: '',     // ex.: 'escritorio.webp'
    ogImage: '',        // ex.: 'og-defesa-criminal.jpg' (1200x630)
  },
};
