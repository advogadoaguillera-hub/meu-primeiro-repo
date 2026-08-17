/* ==========================================================================
   ADVOCACIA DA TERRA — comportamento do site
   --------------------------------------------------------------------------
   Sem bibliotecas externas. Tudo o que este arquivo faz:
     1. Aplica os dados de config.js (contato, redes, links)
     2. Menu de navegação no celular
     3. Envio do formulário
     4. Ano no rodapé
     5. Revelação suave das seções ao rolar
     6. Analytics opcional (só carrega se estiver configurado)
   ========================================================================== */

(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};
  var contato = cfg.contato || {};
  var redes = cfg.redes || {};

  /* ----------------------------------------------------------------------
     Utilitários
     ---------------------------------------------------------------------- */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function preenchido(valor) {
    return typeof valor === 'string' && valor.trim() !== '';
  }

  /** Mostra ou oculta a linha (<li data-campo="...">) conforme o valor existir. */
  function alternarLinha(campo, existe) {
    $$('[data-campo="' + campo + '"]').forEach(function (el) {
      el.hidden = !existe;
    });
  }

  function montarLinkWhatsapp(mensagem) {
    var numero = contato.whatsapp || '';
    if (!preenchido(numero)) return '';
    var base = 'https://wa.me/' + numero.replace(/\D/g, '');
    return preenchido(mensagem)
      ? base + '?text=' + encodeURIComponent(mensagem)
      : base;
  }

  /* ----------------------------------------------------------------------
     1. APLICAR CONFIGURAÇÃO
     ---------------------------------------------------------------------- */
  function aplicarConfiguracao() {
    var temWhatsapp = preenchido(contato.whatsapp);
    var linkWpp = montarLinkWhatsapp(cfg.mensagemWhatsapp);

    // --- WhatsApp ---
    alternarLinha('whatsapp', temWhatsapp);
    if (temWhatsapp) {
      var rotulo = contato.whatsappExibicao || contato.whatsapp;

      [$('#linkWhatsappTexto'), $('#rodapeWhatsapp')].forEach(function (el) {
        if (!el) return;
        el.href = linkWpp;
        el.textContent = rotulo;
      });

      var flutuante = $('#whatsappFlutuante');
      if (flutuante) flutuante.href = linkWpp;
    } else {
      var flutuanteOculto = $('#whatsappFlutuante');
      if (flutuanteOculto) flutuanteOculto.hidden = true;
    }

    // --- E-mail ---
    var temEmail = preenchido(contato.email);
    alternarLinha('email', temEmail);
    if (temEmail) {
      [$('#linkEmail'), $('#rodapeEmail')].forEach(function (el) {
        if (!el) return;
        el.href = 'mailto:' + contato.email;
        el.textContent = contato.email;
      });
    }

    // --- Telefone fixo ---
    var temTelefone = preenchido(contato.telefoneFixo);
    alternarLinha('telefoneFixo', temTelefone);
    if (temTelefone) {
      [$('#linkTelefone'), $('#rodapeTelefone')].forEach(function (el) {
        if (!el) return;
        el.href = 'tel:+55' + contato.telefoneFixo.replace(/\D/g, '');
        el.textContent = contato.telefoneFixo;
      });
    }

    // --- Endereço ---
    var partes = [contato.endereco, contato.complemento].filter(preenchido);
    var localidade = [contato.cidade, contato.estado].filter(preenchido).join(' — ');
    if (preenchido(contato.cep)) partes.push('CEP ' + contato.cep);
    var enderecoCompleto = partes.length
      ? partes.join(', ') + (localidade ? ' · ' + localidade : '')
      : '';

    var temEndereco = preenchido(enderecoCompleto);
    alternarLinha('endereco', temEndereco);
    if (temEndereco) {
      [$('#textoEndereco'), $('#rodapeEndereco')].forEach(function (el) {
        if (el) el.textContent = enderecoCompleto;
      });
    }

    // --- Horário ---
    var temHorario = preenchido(contato.horarioAtendimento);
    alternarLinha('horarioAtendimento', temHorario);
    if (temHorario) {
      [$('#textoHorario'), $('#rodapeHorario')].forEach(function (el) {
        if (el) el.textContent = contato.horarioAtendimento;
      });
    }

    // --- Redes sociais (aparecem só quando preenchidas) ---
    [
      ['instagram', '#redeInstagram'],
      ['linkedin',  '#redeLinkedin'],
      ['facebook',  '#redeFacebook'],
      ['youtube',   '#redeYoutube']
    ].forEach(function (par) {
      var chave = par[0];
      var link = $(par[1]);
      var item = document.querySelector('[data-rede="' + chave + '"]');
      var url = redes[chave];

      if (link && item && preenchido(url)) {
        link.href = url;
        item.hidden = false;
      }
    });

    // Esconde a régua de redes se nenhuma foi preenchida
    var listaRedes = $('#rodapeRedes');
    if (listaRedes) {
      var algumaVisivel = $$('#rodapeRedes li').some(function (li) { return !li.hidden; });
      if (!algumaVisivel) listaRedes.style.display = 'none';
    }

    // --- Canônica / Open Graph quando o domínio for definido ---
    var url = (cfg.site && cfg.site.url) || '';
    if (preenchido(url)) {
      var canonica = document.createElement('link');
      canonica.rel = 'canonical';
      canonica.href = url;
      document.head.appendChild(canonica);

      var og = document.createElement('meta');
      og.setAttribute('property', 'og:url');
      og.content = url;
      document.head.appendChild(og);
    }
  }

  /* ----------------------------------------------------------------------
     2. MENU DE NAVEGAÇÃO (CELULAR)
     ---------------------------------------------------------------------- */
  function iniciarMenu() {
    var botao = $('#menuBotao');
    var nav = $('#navPrincipal');
    if (!botao || !nav) return;

    function fechar() {
      nav.classList.remove('nav--aberto');
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu de navegação');
    }

    botao.addEventListener('click', function () {
      var aberto = nav.classList.toggle('nav--aberto');
      botao.setAttribute('aria-expanded', String(aberto));
      botao.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    });

    // Fecha ao clicar em um item
    nav.addEventListener('click', function (evento) {
      if (evento.target.tagName === 'A') fechar();
    });

    // Fecha com a tecla Esc
    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') fechar();
    });

    // Fecha ao voltar para desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960) fechar();
    });
  }

  /* ----------------------------------------------------------------------
     3. FORMULÁRIO
     ---------------------------------------------------------------------- */
  function iniciarFormulario() {
    var form = $('#formularioContato');
    var aviso = $('#formularioAviso');
    if (!form) return;

    var config = cfg.formulario || {};
    var destino = config.destino || 'whatsapp';

    function informar(texto, estado) {
      if (!aviso) return;
      aviso.textContent = texto;
      aviso.setAttribute('data-estado', estado || '');
    }

    function validar() {
      var invalidos = [];
      ['nome', 'whatsapp', 'mensagem'].forEach(function (id) {
        var campo = document.getElementById(id);
        if (!campo) return;
        var vazio = campo.value.trim() === '';
        campo.setAttribute('aria-invalid', String(vazio));
        if (vazio) invalidos.push(campo);
      });
      return invalidos;
    }

    function montarTexto(dados) {
      var linhas = [
        'Contato pelo site — Advocacia da Terra',
        '',
        'Nome: ' + dados.nome,
        'WhatsApp: ' + dados.whatsapp
      ];
      if (dados.email)      linhas.push('E-mail: ' + dados.email);
      if (dados.municipio)  linhas.push('Localização do imóvel: ' + dados.municipio);
      if (dados.tipoImovel) linhas.push('Tipo de imóvel: ' + dados.tipoImovel);
      if (dados.area)       linhas.push('Área aproximada: ' + dados.area);
      if (dados.necessidade) linhas.push('Necessidade: ' + dados.necessidade);
      linhas.push('', 'Situação:', dados.mensagem);
      return linhas.join('\n');
    }

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var invalidos = validar();
      if (invalidos.length) {
        informar('Preencha nome, WhatsApp e a descrição da situação.', 'erro');
        invalidos[0].focus();
        return;
      }

      var dados = {};
      ['nome', 'whatsapp', 'email', 'municipio', 'tipoImovel', 'area', 'necessidade', 'mensagem']
        .forEach(function (id) {
          var campo = document.getElementById(id);
          dados[id] = campo ? campo.value.trim() : '';
        });

      var texto = montarTexto(dados);

      if (destino === 'endpoint' && preenchido(config.endpoint)) {
        informar('Enviando…', '');
        fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        })
          .then(function (resposta) {
            if (!resposta.ok) throw new Error('Falha no envio');
            form.reset();
            informar('Mensagem enviada. O retorno será feito pelo contato informado.', 'ok');
          })
          .catch(function () {
            informar('Não foi possível enviar agora. Tente pelo WhatsApp.', 'erro');
          });
        return;
      }

      if (destino === 'email' && preenchido(contato.email)) {
        window.location.href = 'mailto:' + contato.email +
          '?subject=' + encodeURIComponent('Contato pelo site — análise de propriedade') +
          '&body=' + encodeURIComponent(texto);
        informar('Abrindo seu programa de e-mail…', 'ok');
        return;
      }

      // Padrão: WhatsApp
      var link = montarLinkWhatsapp(texto);
      if (!link) {
        informar('Canal de contato não configurado.', 'erro');
        return;
      }
      window.open(link, '_blank', 'noopener');
      informar('Abrindo o WhatsApp com os dados preenchidos…', 'ok');
    });
  }

  /* ----------------------------------------------------------------------
     4. ANO NO RODAPÉ
     ---------------------------------------------------------------------- */
  function iniciarAno() {
    var ano = $('#anoAtual');
    if (ano) ano.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------------------
     5. REVELAÇÃO SUAVE AO ROLAR
     ---------------------------------------------------------------------- */
  function iniciarRevelacao() {
    var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzir || !('IntersectionObserver' in window)) return;

    var alvos = $$('.secao__cabecalho, .momento, .solucao, .numero, .pilar, .momento-chave__texto, .formulario, .citacao');
    if (!alvos.length) return;

    alvos.forEach(function (el) { el.classList.add('revelar'); });

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visivel');
          observador.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

    alvos.forEach(function (el) { observador.observe(el); });
  }

  /* ----------------------------------------------------------------------
     6. ANALYTICS OPCIONAL
     Só executa se um ID estiver preenchido em config.js.
     ---------------------------------------------------------------------- */
  function iniciarAnalytics() {
    var a = cfg.analytics || {};

    if (preenchido(a.googleTagManagerId)) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var gtm = document.createElement('script');
      gtm.async = true;
      gtm.src = 'https://www.googletagmanager.com/gtm.js?id=' + a.googleTagManagerId;
      document.head.appendChild(gtm);
    }

    if (preenchido(a.googleAnalyticsId)) {
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + a.googleAnalyticsId;
      document.head.appendChild(ga);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', a.googleAnalyticsId);
    }
  }

  /* ----------------------------------------------------------------------
     Inicialização
     ---------------------------------------------------------------------- */
  function iniciar() {
    aplicarConfiguracao();
    iniciarMenu();
    iniciarFormulario();
    iniciarAno();
    iniciarRevelacao();
    iniciarAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
