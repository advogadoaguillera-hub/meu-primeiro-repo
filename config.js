/* ==========================================================================
   CONFIGURAÇÃO DO SITE — Jocsan Aguillera | Advocacia da Terra
   --------------------------------------------------------------------------
   Este é o ÚNICO arquivo que precisa ser editado para atualizar os dados de
   contato, redes sociais e integrações do site.

   Campos com valor "" (vazio) ficam automaticamente OCULTOS no site.
   Basta preencher para que apareçam.

   NÃO coloque tokens, senhas ou chaves secretas neste arquivo — ele é público.
   ========================================================================== */

window.SITE_CONFIG = {

  /* ---------------------------------------------------------------------
     1. IDENTIFICAÇÃO PROFISSIONAL
     --------------------------------------------------------------------- */
  advogado: {
    nome: 'Jocsan Aguillera',
    titulo: 'Advogado',
    oab: 'OAB/MS nº 18.115',
  },

  marca: {
    nome: 'Advocacia da Terra',
    descritor: 'Direito Imobiliário · Fundiário · Patrimonial',
  },

  /* ---------------------------------------------------------------------
     2. CONTATO
     Preencha o que existir. O que ficar vazio não aparece no site.
     --------------------------------------------------------------------- */
  contato: {
    // Número no formato internacional, apenas dígitos (55 + DDD + número).
    whatsapp: '5567998325997',
    // Como o número aparece escrito na tela.
    whatsappExibicao: '(67) 99832-5997',

    email: 'advogadoaguillera@gmail.com',

    // ---- CAMPOS A PREENCHER QUANDO HOUVER ----
    telefoneFixo: '',        // ex.: '(67) 3231-0000'
    endereco: '',            // ex.: 'Rua Exemplo, 123 — Centro'
    complemento: '',         // ex.: 'Sala 4'
    cidade: 'Corumbá',
    estado: 'MS',
    cep: '',                 // ex.: '79300-000'
    horarioAtendimento: '',  // ex.: 'Segunda a sexta, 8h às 18h'
  },

  /* ---------------------------------------------------------------------
     3. REDES SOCIAIS
     Deixe vazio o que ainda não existir — o ícone não será exibido.
     --------------------------------------------------------------------- */
  redes: {
    instagram: '',   // ex.: 'https://instagram.com/seuperfil'
    linkedin: '',    // ex.: 'https://linkedin.com/in/seuperfil'
    facebook: '',
    youtube: '',
  },

  /* ---------------------------------------------------------------------
     4. MENSAGEM PADRÃO DO WHATSAPP
     --------------------------------------------------------------------- */
  mensagemWhatsapp:
    'Olá, Jocsan. Gostaria de conversar sobre uma propriedade e entender ' +
    'quais documentos e informações precisam ser analisados.',

  /* ---------------------------------------------------------------------
     5. FORMULÁRIO
     --------------------------------------------------------------------- */
  formulario: {
    // 'whatsapp'  -> monta a mensagem e abre o WhatsApp (não exige servidor)
    // 'email'     -> abre o programa de e-mail do visitante
    // 'endpoint'  -> envia para um serviço externo (Formspree, Basin, etc.)
    destino: 'whatsapp',

    // Usado apenas quando destino === 'endpoint'.
    // Ex.: 'https://formspree.io/f/SEU_ID'
    endpoint: '',
  },

  /* ---------------------------------------------------------------------
     6. DOMÍNIO
     Preencha quando o domínio definitivo for registrado.
     Usado nas tags canônicas, Open Graph e sitemap.
     --------------------------------------------------------------------- */
  site: {
    url: '',  // ex.: 'https://www.advocaciadaterra.com.br'
  },

  /* ---------------------------------------------------------------------
     7. ANALYTICS / PIXEL  (opcional, preencher depois)
     Deixe vazio para não carregar nenhum script de terceiros — o site fica
     mais rápido e não instala cookies desnecessários.
     --------------------------------------------------------------------- */
  analytics: {
    googleTagManagerId: '',  // ex.: 'GTM-XXXXXXX'
    googleAnalyticsId: '',   // ex.: 'G-XXXXXXXXXX'
    metaPixelId: '',         // ex.: '123456789012345'
  },
};
