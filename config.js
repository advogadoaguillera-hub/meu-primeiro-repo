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

    endereco: 'Rua Firmo de Matos, 1464',
    complemento: '',         // ex.: 'Sala 4'
    bairro: 'Centro',
    cidade: 'Corumbá',
    estado: 'MS',

    // ---- CAMPOS A PREENCHER QUANDO HOUVER ----
    telefoneFixo: '',        // ex.: '(67) 3231-0000'
    cep: '',                 // ex.: '79300-000'
    horarioAtendimento: '',  // ex.: 'Segunda a sexta, 8h às 18h'
  },

  /* ---------------------------------------------------------------------
     2-B. ABRANGÊNCIA DO ATENDIMENTO
     Escritório em Corumbá/MS, com atendimento em todo o Brasil.
     --------------------------------------------------------------------- */
  atendimento: {
    base: 'Corumbá — Mato Grosso do Sul',
    abrangencia: 'Corumbá/MS e todo o Brasil',
    idiomas: ['Português'],
    remoto: true,
  },

  /* ---------------------------------------------------------------------
     2-C. VÍDEOS
     ---------------------------------------------------------------------
     Enquanto estiver vazio, NADA de vídeo aparece no site: nem o botão no
     topo, nem a seção de vídeos. Assim o site nunca mostra player quebrado.

     Para publicar um vídeo:
       1. Suba o vídeo no YouTube (pode ficar "não listado" se preferir).
       2. Copie só o CÓDIGO do endereço, não o endereço inteiro.
          Ex.: em  https://www.youtube.com/watch?v=AbC123xyz
               o código é          AbC123xyz
       3. Cole abaixo entre as aspas.
     --------------------------------------------------------------------- */
  videos: {
    // Vídeo de apresentação — abre em uma janela sobre o site, a partir do
    // botão "Ver vídeo de apresentação" no topo.
    apresentacao: {
      youtubeId: '',                    // ex.: 'AbC123xyz'
      titulo: 'Vídeo de apresentação',
    },

    // Demais vídeos — aparecem na seção "Vídeos".
    // Acrescente quantos quiser, seguindo o mesmo formato.
    // Ex.: { youtubeId: 'AbC123xyz', titulo: 'Como funciona a auditoria',
    //        descricao: 'Resumo em 3 minutos.' },
    galeria: [],
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
