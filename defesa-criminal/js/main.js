/* ==========================================================================
   JOCSAN AGUILLERA — DEFESA CRIMINAL ESTRATÉGICA
   JavaScript único, sem dependências. Progressivo: o site funciona sem ele.
   --------------------------------------------------------------------------
     01. Utilitários
     02. Injeção de dados do config.js
     03. Navegação
     04. FAQ (acordeão acessível)
     05. Filtros de categoria
     06. Formulário de contato
     07. Revelação ao rolar
     08. Analytics (somente se configurado)
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $  = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  /* =======================================================================
     01. UTILITÁRIOS
     ======================================================================= */

  /** Lê caminho aninhado: obter(CFG, 'contato.email') */
  function obter(obj, caminho) {
    return caminho.split('.').reduce(function (o, k) {
      return (o && o[k] !== undefined && o[k] !== null) ? o[k] : '';
    }, obj);
  }

  /** Monta a URL do WhatsApp a partir do config. */
  function urlWhatsapp(mensagem) {
    var num = obter(CFG, 'contato.whatsapp');
    if (!num) return '';
    var txt = mensagem || obter(CFG, 'mensagemWhatsapp') || '';
    return 'https://wa.me/' + num + (txt ? '?text=' + encodeURIComponent(txt) : '');
  }

  /* =======================================================================
     02. INJEÇÃO DE DADOS DO CONFIG
     Elementos com [data-cfg="caminho"] recebem o valor como texto.
     Elementos com [data-cfg-href="caminho"] recebem como link.
     Se o valor estiver vazio, o elemento (ou seu [data-cfg-bloco]) some.
     ======================================================================= */
  function aplicarConfig() {

    $$('[data-cfg]').forEach(function (el) {
      var valor = obter(CFG, el.getAttribute('data-cfg'));
      if (valor) {
        el.textContent = valor;
      } else {
        var bloco = el.closest('[data-cfg-bloco]') || el;
        bloco.classList.add('oculto');
      }
    });

    $$('[data-cfg-href]').forEach(function (el) {
      var chave = el.getAttribute('data-cfg-href');
      var valor = '';

      if (chave === 'whatsapp') {
        valor = urlWhatsapp(el.getAttribute('data-msg') || '');
      } else if (chave === 'email') {
        var mail = obter(CFG, 'contato.email');
        valor = mail ? 'mailto:' + mail : '';
      } else if (chave === 'telefone') {
        var tel = obter(CFG, 'contato.telefoneFixo');
        valor = tel ? 'tel:' + tel.replace(/\D/g, '') : '';
      } else {
        valor = obter(CFG, chave);
      }

      if (valor) {
        el.setAttribute('href', valor);
      } else {
        (el.closest('[data-cfg-bloco]') || el).classList.add('oculto');
      }
    });

    // Idiomas ativos
    var alvoIdiomas = $('[data-idiomas]');
    if (alvoIdiomas) {
      var lista = (CFG.idiomas || []).filter(function (i) { return i.ativo; })
                                     .map(function (i) { return i.nome; });
      if (lista.length) {
        alvoIdiomas.textContent = lista.join(' · ');
      } else {
        (alvoIdiomas.closest('[data-cfg-bloco]') || alvoIdiomas).classList.add('oculto');
      }
    }

    // Formação — só exibe instituição/ano quando preenchidos
    var alvoFormacao = $('[data-formacao]');
    if (alvoFormacao) {
      var itens = (CFG.formacao || []).filter(function (f) { return f.titulo; });
      if (itens.length) {
        alvoFormacao.innerHTML = itens.map(function (f) {
          var det = [f.instituicao, f.ano].filter(Boolean).join(' · ');
          return '<li>' + f.titulo + (det ? ' <span class="pequeno">— ' + det + '</span>' : '') + '</li>';
        }).join('');
      }
    }

    // Imagens configuráveis: se houver arquivo, substitui o placeholder.
    $$('[data-img]').forEach(function (el) {
      var arquivo = obter(CFG, 'imagens.' + el.getAttribute('data-img'));
      if (!arquivo) return;
      var img = new Image();
      img.src = (el.getAttribute('data-img-base') || 'assets/img/') + arquivo;
      img.alt = el.getAttribute('data-img-alt') || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      el.replaceChildren(img);
      el.classList.remove('placeholder');
    });

    // Ano corrente no rodapé
    $$('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* =======================================================================
     03. NAVEGAÇÃO
     ======================================================================= */
  function navegacao() {
    var btn = $('.menu-btn');
    var nav = $('#nav-principal');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var aberto = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!aberto));
      nav.classList.toggle('aberto', !aberto);
    });

    // Fecha ao navegar (mobile)
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.innerWidth < 900) {
        btn.setAttribute('aria-expanded', 'false');
        nav.classList.remove('aberto');
      }
    });

    // Fecha com Esc
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('aberto')) {
        btn.setAttribute('aria-expanded', 'false');
        nav.classList.remove('aberto');
        btn.focus();
      }
    });

    // Marca a página atual
    var atual = location.pathname.split('/').pop() || 'index.html';
    $$('.nav__link').forEach(function (a) {
      var alvo = (a.getAttribute('href') || '').split('/').pop();
      if (alvo === atual) a.setAttribute('aria-current', 'page');
    });
  }

  /* =======================================================================
     04. FAQ — acordeão acessível
     ======================================================================= */
  function faq() {
    $$('.faq__pergunta').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var aberto = btn.getAttribute('aria-expanded') === 'true';
        var painel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!aberto));
        if (painel) painel.hidden = aberto;
      });
    });
  }

  /* =======================================================================
     05. FILTROS DE CATEGORIA (artigos, vídeos, jurisprudência)
     ======================================================================= */
  function filtros() {
    var grupos = $$('[data-filtros]');
    grupos.forEach(function (grupo) {
      var alvoSel = grupo.getAttribute('data-filtros');
      var itens = $$('[data-categoria]', document.querySelector(alvoSel) || document);

      grupo.addEventListener('click', function (e) {
        var btn = e.target.closest('.filtro');
        if (!btn) return;

        var cat = btn.getAttribute('data-cat');
        $$('.filtro', grupo).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });

        var visiveis = 0;
        itens.forEach(function (item) {
          var mostra = (cat === 'todos') ||
                       (item.getAttribute('data-categoria') || '').split(' ').indexOf(cat) !== -1;
          item.hidden = !mostra;
          if (mostra) visiveis++;
        });

        var vazio = $('[data-filtro-vazio]');
        if (vazio) vazio.hidden = visiveis > 0;
      });
    });
  }

  /* =======================================================================
     06. FORMULÁRIO DE CONTATO
     ======================================================================= */
  function formulario() {
    var form = $('#form-contato');
    if (!form) return;

    var retorno = $('#form-retorno');
    var destino = obter(CFG, 'formulario.destino') || 'whatsapp';
    var endpoint = obter(CFG, 'formulario.endpoint');

    function avisar(msg) {
      if (!retorno) return;
      retorno.textContent = msg;
      retorno.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var d = new FormData(form);
      var nome = (d.get('nome') || '').toString().trim();
      var situacao = (d.get('situacao') || '').toString();
      var cidade = (d.get('cidade') || '').toString().trim();
      var email = (d.get('email') || '').toString().trim();
      var relato = (d.get('relato') || '').toString().trim();

      if (!nome || !situacao) {
        avisar('Preencha ao menos o nome e o tipo de situação.');
        return;
      }

      var linhas = [
        'Contato pelo site — Defesa Criminal',
        '',
        'Nome: ' + nome,
        'Situação: ' + situacao
      ];
      if (cidade) linhas.push('Cidade: ' + cidade);
      if (email)  linhas.push('E-mail: ' + email);
      if (relato) linhas.push('', 'Resumo: ' + relato);

      var texto = linhas.join('\n');

      if (destino === 'endpoint' && endpoint) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: d
        }).then(function (r) {
          if (r.ok) { form.reset(); avisar('Mensagem enviada. O retorno será feito pelo contato informado.'); }
          else { avisar('Não foi possível enviar agora. Tente pelo WhatsApp ou e-mail.'); }
        }).catch(function () {
          avisar('Não foi possível enviar agora. Tente pelo WhatsApp ou e-mail.');
        });
        return;
      }

      if (destino === 'email') {
        var mail = obter(CFG, 'contato.email');
        if (!mail) { avisar('Canal de e-mail não configurado.'); return; }
        window.location.href = 'mailto:' + mail +
          '?subject=' + encodeURIComponent('Contato pelo site — ' + situacao) +
          '&body=' + encodeURIComponent(texto);
        avisar('Abrindo seu programa de e-mail…');
        return;
      }

      var url = urlWhatsapp(texto);
      if (!url) { avisar('Canal de WhatsApp não configurado.'); return; }
      window.open(url, '_blank', 'noopener');
      avisar('Abrindo o WhatsApp com o resumo preenchido.');
    });
  }

  /* =======================================================================
     07. REVELAÇÃO AO ROLAR
     ======================================================================= */
  function revelar() {
    var alvos = $$('.revelar');
    if (!alvos.length) return;

    if (!('IntersectionObserver' in window)) {
      alvos.forEach(function (el) { el.classList.add('visivel'); });
      return;
    }

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('visivel');
          obs.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

    alvos.forEach(function (el) { obs.observe(el); });
  }

  /* =======================================================================
     08. ANALYTICS — carregado apenas se houver ID configurado
     ======================================================================= */
  function analytics() {
    var ga  = obter(CFG, 'analytics.googleAnalyticsId');
    var gtm = obter(CFG, 'analytics.googleTagManagerId');
    var px  = obter(CFG, 'analytics.metaPixelId');

    if (gtm) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtm.js?id=' + gtm;
      document.head.appendChild(s);
    } else if (ga) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga;
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', ga);
    }

    if (px) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', px); window.fbq('track', 'PageView');
      /* eslint-enable */
    }
  }

  /* ======================================================================= */
  function iniciar() {
    aplicarConfig();
    navegacao();
    faq();
    filtros();
    formulario();
    revelar();
    analytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
