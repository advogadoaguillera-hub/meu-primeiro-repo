/* ==========================================================================
   ANÁLISE DE VIABILIDADE — jogo de perguntas e respostas
   --------------------------------------------------------------------------
   Tudo acontece no navegador do visitante: nenhuma resposta é enviada a
   servidor algum. Ao final, a pessoa escolhe se quer mandar o resultado pelo
   WhatsApp.

   O resultado é INDICATIVO. Ele orienta sobre o caminho provável e os passos
   envolvidos — não substitui a análise dos documentos e não promete resultado.

   Para editar perguntas ou resultados, altere o objeto FLUXOS abaixo.
   Cada fluxo tem:
     rotulo      → texto do cartão na tela de escolha
     perguntas   → lista de perguntas; "se" é opcional e define quando a
                   pergunta aparece
     resultado() → recebe as respostas e devolve o diagnóstico
   ========================================================================== */

(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};

  /* ------------------------------------------------------------------------
     Opções reaproveitadas
     ------------------------------------------------------------------------ */
  var OPCOES_TEMPO = [
    { v: 'menos5', t: 'Menos de 5 anos' },
    { v: '5a10',   t: 'De 5 a 10 anos' },
    { v: '10a15',  t: 'De 10 a 15 anos' },
    { v: 'mais15', t: 'Mais de 15 anos' }
  ];

  var ANOS = { menos5: 0, '5a10': 5, '10a15': 10, mais15: 15 };

  /* Condições para pular perguntas que já não mudam o resultado.
     Ex.: quem responde "sou caseiro" já tem o diagnóstico — não precisa
     responder mais seis perguntas. */
  function quando(campo, valor) {
    return function (r) { return r[campo] === valor; };
  }
  function todas() {
    var condicoes = Array.prototype.slice.call(arguments);
    return function (r) { return condicoes.every(function (c) { return c(r); }); };
  }
  var DONO_SEM_DISPUTA = todas(quando('modo', 'dono'), quando('disputa', 'nao'));

  var DOCS_POSSE = [
    'Carnês de IPTU ou ITR, de preferência um de cada ano',
    'Contas de água e energia no endereço, em seu nome',
    'Contrato, recibos ou comprovantes de pagamento, se houver',
    'Fotos antigas no imóvel, com data',
    'Nome e contato de vizinhos antigos que conhecem a sua ocupação',
    'Certidão da matrícula do imóvel, se ele tiver matrícula'
  ];

  var PASSOS_USUCAPIAO = [
    'Levantar a matrícula do imóvel e a situação dos vizinhos de divisa',
    'Reunir a prova da posse, ano a ano',
    'Fazer planta e memorial descritivo com profissional habilitado',
    'Lavrar a ata notarial no cartório de notas, se o caminho for extrajudicial',
    'Apresentar o pedido no Registro de Imóveis — ou ação judicial, se houver discordância',
    'Registrar a propriedade na matrícula, em seu nome'
  ];

  /* ------------------------------------------------------------------------
     FLUXOS
     ------------------------------------------------------------------------ */
  var FLUXOS = {

    /* ================================================================ */
    usucapiao: {
      rotulo: 'Moro ou ocupo o imóvel há anos e não tenho escritura',
      perguntas: [
        {
          id: 'modo',
          texto: 'Como você está no imóvel?',
          ajuda: 'Essa é a pergunta mais importante. Responda como a ocupação realmente é.',
          opcoes: [
            { v: 'dono',        t: 'Como dono: comprei, recebi ou ocupei e cuido como meu' },
            { v: 'permissao',   t: 'Com permissão do dono: emprestado ou cedido por parente' },
            { v: 'funcionario', t: 'Por trabalho: caseiro, administrador ou funcionário' },
            { v: 'aluguel',     t: 'Pagando ou tendo pago aluguel' }
          ]
        },
        {
          id: 'disputa',
          se: quando('modo', 'dono'),
          texto: 'Alguém já reclamou o imóvel ou pediu que você saísse?',
          opcoes: [
            { v: 'nao', t: 'Nunca' },
            { v: 'sim', t: 'Sim, já houve reclamação ou disputa' }
          ]
        },
        { id: 'tempo', se: DONO_SEM_DISPUTA, texto: 'Há quanto tempo você ocupa o imóvel sem interrupção?', opcoes: OPCOES_TEMPO },
        {
          id: 'tipo',
          se: DONO_SEM_DISPUTA,
          texto: 'O imóvel fica na cidade ou na zona rural?',
          opcoes: [
            { v: 'urbano', t: 'Na cidade' },
            { v: 'rural',  t: 'Na zona rural' }
          ]
        },
        {
          id: 'tamanho',
          se: DONO_SEM_DISPUTA,
          texto: 'Qual é o tamanho aproximado?',
          opcoes: function (r) {
            return r.tipo === 'rural'
              ? [{ v: 'pequeno', t: 'Até 50 hectares' }, { v: 'grande', t: 'Mais de 50 hectares' }]
              : [{ v: 'pequeno', t: 'Até 250 m²' },      { v: 'grande', t: 'Mais de 250 m²' }];
          }
        },
        {
          id: 'outro',
          se: DONO_SEM_DISPUTA,
          texto: 'Você é dono de algum outro imóvel?',
          opcoes: [
            { v: 'nao', t: 'Não' },
            { v: 'sim', t: 'Sim' }
          ]
        },
        {
          id: 'docs',
          se: DONO_SEM_DISPUTA,
          texto: 'Que documentos você tem?',
          opcoes: [
            { v: 'contrato', t: 'Contrato de compra ou recibo do negócio' },
            { v: 'contas',   t: 'Só contas, IPTU e comprovantes do dia a dia' },
            { v: 'nenhum',   t: 'Praticamente nenhum' }
          ]
        }
      ],

      resultado: function (r) {
        var anos = ANOS[r.tempo] || 0;
        var alertaSemDocs = r.docs === 'nenhum'
          ? 'Sem documentos, a prova depende mais de testemunhas, imagens históricas e ata notarial. É possível, mas exige mais preparo.'
          : '';

        if (r.modo !== 'dono') {
          return {
            nivel: 'atencao',
            titulo: 'Do jeito descrito, a ocupação ainda não é posse de dono',
            caminho: 'Análise da natureza da ocupação',
            explicacao: 'Quem está no imóvel com permissão do dono, por trabalho ou pagando aluguel, em regra não exerce posse como dono — e, sem isso, o tempo sozinho não leva à usucapião. Há situações em que essa condição muda ao longo dos anos, mas isso exige prova e análise individual.',
            passos: [
              'Reunir documentos que mostrem como a ocupação começou',
              'Identificar se, e desde quando, você passou a agir como dono sem oposição',
              'Avaliar com o advogado se existe caminho — usucapião ou outra solução'
            ],
            documentos: DOCS_POSSE
          };
        }

        if (r.disputa === 'sim') {
          return {
            nivel: 'atencao',
            titulo: 'A disputa sobre o imóvel precisa ser analisada primeiro',
            caminho: 'Análise da disputa e do tempo de posse',
            explicacao: 'A usucapião exige posse sem oposição. Se alguém já reclamou o imóvel, é preciso ver quando e como isso aconteceu: dependendo da forma, o tempo pode ter sido interrompido — ou não.',
            passos: [
              'Reunir tudo o que houve na disputa: notificações, mensagens, processos',
              'Montar a linha do tempo da posse antes e depois da reclamação',
              'Avaliar com o advogado se o prazo foi afetado e qual é o caminho'
            ],
            documentos: DOCS_POSSE
          };
        }

        if (anos >= 5 && r.tamanho === 'pequeno' && r.outro === 'nao') {
          var urbano = r.tipo !== 'rural';
          return {
            nivel: 'alta',
            titulo: 'Bons indícios para a usucapião especial',
            caminho: urbano ? 'Usucapião especial urbana' : 'Usucapião especial rural',
            explicacao: urbano
              ? 'Imóvel urbano de até 250 m² usado como moradia, posse de pelo menos 5 anos sem oposição e nenhum outro imóvel em seu nome: esses são os requisitos centrais da modalidade especial urbana, a de prazo mais curto.'
              : 'Área rural de até 50 hectares, tornada produtiva pelo trabalho da família e onde ela mora, com posse de pelo menos 5 anos sem oposição e nenhum outro imóvel em seu nome: esses são os requisitos centrais da usucapião especial rural.',
            passos: PASSOS_USUCAPIAO,
            documentos: DOCS_POSSE,
            alerta: alertaSemDocs,
            nota: 'Havendo concordância dos vizinhos e do titular do registro, o pedido pode ser feito em cartório, o que costuma ser mais rápido. Havendo discordância, o caminho é judicial.'
          };
        }

        if (anos >= 15) {
          return {
            nivel: 'alta',
            titulo: 'Bons indícios para a usucapião extraordinária',
            caminho: 'Usucapião extraordinária',
            explicacao: 'Com 15 anos ou mais de posse contínua, sem oposição e como dono, a modalidade extraordinária dispensa documento de compra e prova de boa-fé.',
            passos: PASSOS_USUCAPIAO,
            documentos: DOCS_POSSE,
            alerta: alertaSemDocs,
            nota: 'Havendo concordância dos vizinhos e do titular do registro, o pedido pode ser feito em cartório. Havendo discordância, o caminho é judicial.'
          };
        }

        if (anos >= 10 && r.docs === 'contrato') {
          return {
            nivel: 'alta',
            titulo: 'Bons indícios para a usucapião ordinária',
            caminho: 'Usucapião ordinária',
            explicacao: 'Com 10 anos ou mais de posse e um documento de aquisição — como um contrato particular de compra —, a modalidade ordinária costuma ser o caminho. O contrato ajuda a demonstrar a boa-fé.',
            passos: PASSOS_USUCAPIAO,
            documentos: DOCS_POSSE
          };
        }

        if (anos >= 10) {
          return {
            nivel: 'media',
            titulo: 'Possível, dependendo da prova',
            caminho: 'Usucapião extraordinária com prazo reduzido',
            explicacao: 'A modalidade extraordinária pode ter o prazo reduzido para 10 anos quando o possuidor mora no imóvel ou fez nele obras ou investimentos produtivos. É essa condição que precisa ser demonstrada.',
            passos: PASSOS_USUCAPIAO,
            documentos: DOCS_POSSE,
            alerta: alertaSemDocs
          };
        }

        if (anos >= 5) {
          return {
            nivel: 'media',
            titulo: 'Tempo relevante — modalidade a confirmar',
            caminho: 'Usucapião: confirmar prazo e modalidade',
            explicacao: 'Você já tem tempo importante, mas pelas respostas o imóvel não entra na modalidade especial — por tamanho ou por existir outro imóvel em seu nome. As outras modalidades pedem prazo maior. Vale conferir datas com cuidado: a posse pode ter começado antes do que se imagina, e às vezes é possível somar o tempo de quem ocupava antes de você.',
            passos: [
              'Reconstruir a data exata de início da posse, com documentos',
              'Verificar se é possível somar o tempo do ocupante anterior',
              'Continuar documentando a posse ano a ano',
              'Definir com o advogado a modalidade e o momento certo do pedido'
            ],
            documentos: DOCS_POSSE
          };
        }

        return {
          nivel: 'atencao',
          titulo: 'O prazo mínimo ainda não se completou',
          caminho: 'Documentar a posse enquanto o prazo corre',
          explicacao: 'Em regra, a usucapião exige pelo menos 5 anos de posse. Enquanto o tempo corre, o mais valioso é documentar a posse ano a ano — e verificar se é possível somar o tempo de quem ocupava o imóvel antes de você.',
          passos: [
            'Guardar desde já contas, IPTU e comprovantes em seu nome',
            'Verificar se o ocupante anterior tinha posse que possa ser somada',
            'Avaliar se existe outro caminho mais rápido, como a adjudicação'
          ],
          documentos: DOCS_POSSE
        };
      }
    },

    /* ================================================================ */
    gaveta: {
      rotulo: 'Comprei por contrato e nunca passei o imóvel para o meu nome',
      perguntas: [
        {
          id: 'vendedor',
          texto: 'Quem vendeu para você é a pessoa que aparece como dona na matrícula?',
          ajuda: 'A matrícula fica no Registro de Imóveis. Se você nunca a viu, escolha "não sei".',
          opcoes: [
            { v: 'sim',    t: 'Sim, é o dono registrado' },
            { v: 'nao',    t: 'Não — ela também tinha comprado de outra pessoa' },
            { v: 'naosei', t: 'Não sei' }
          ]
        },
        {
          id: 'quitado',
          se: function (r) { return r.vendedor !== 'naosei'; },
          texto: 'O valor combinado foi pago por inteiro?',
          opcoes: [
            { v: 'sim', t: 'Sim, está tudo pago' },
            { v: 'nao', t: 'Ainda falta pagar' }
          ]
        },
        {
          id: 'assina',
          se: todas(quando('vendedor', 'sim'), quando('quitado', 'sim')),
          texto: 'O vendedor pode assinar a escritura hoje?',
          opcoes: [
            { v: 'sim', t: 'Sim, ele está disponível' },
            { v: 'nao', t: 'Não — sumiu, faleceu ou se recusa' }
          ]
        },
        {
          id: 'tempo',
          se: todas(quando('vendedor', 'nao'), quando('quitado', 'sim')),
          texto: 'Há quanto tempo você está com o imóvel?',
          opcoes: OPCOES_TEMPO
        }
      ],

      resultado: function (r) {
        var docs = [
          'Contrato de compra e venda, com todas as páginas',
          'Recibos e comprovantes de todos os pagamentos',
          'Documentos pessoais de quem comprou',
          'Certidão atualizada da matrícula do imóvel',
          'Carnês de IPTU e contas no endereço'
        ];

        if (r.vendedor === 'naosei') {
          return {
            nivel: 'media',
            titulo: 'O primeiro passo é conhecer a matrícula',
            caminho: 'Levantamento da matrícula e da cadeia de contratos',
            explicacao: 'Sem saber quem é o dono registrado, não dá para escolher o caminho. A certidão da matrícula mostra isso — e, a partir dela, se define entre escritura, adjudicação ou usucapião.',
            passos: [
              'Pedir a certidão atualizada da matrícula no Registro de Imóveis',
              'Comparar o dono registrado com quem vendeu para você',
              'Escolher o caminho: escritura, adjudicação compulsória ou usucapião'
            ],
            documentos: docs
          };
        }

        if (r.quitado === 'nao') {
          return {
            nivel: 'media',
            titulo: 'Quitar e formalizar antes de transferir',
            caminho: 'Conclusão do pagamento e formalização da compra',
            explicacao: 'Enquanto houver saldo a pagar, o caminho é concluir o pagamento com recibo formal e manter o contrato em ordem. A escritura e o registro vêm em seguida.',
            passos: [
              'Conferir no contrato quanto falta e como pagar',
              'Pagar com comprovante bancário e obter quitação por escrito',
              'Seguir para escritura e registro'
            ],
            documentos: docs
          };
        }

        if (r.vendedor === 'nao') {
          var tempoBom = (ANOS[r.tempo] || 0) >= 5;
          return {
            nivel: 'media',
            titulo: 'Possível — é preciso reconstruir a cadeia',
            caminho: tempoBom ? 'Adjudicação em cadeia ou usucapião' : 'Reconstituição da cadeia de contratos',
            explicacao: 'Quando houve várias vendas por contrato sem registro, é preciso ligar cada negócio até o dono que está na matrícula. ' +
              (tempoBom
                ? 'Com o tempo que você já tem, a usucapião muitas vezes resolve tudo de uma vez, sem depender de localizar cada vendedor.'
                : 'Reunir todos os contratos da cadeia é o que define se a adjudicação é viável.'),
            passos: [
              'Reunir todos os contratos, do dono registrado até você',
              'Verificar quais vendedores ainda podem ser localizados',
              'Comparar adjudicação e usucapião e escolher o caminho mais seguro',
              'Registrar a propriedade em seu nome'
            ],
            documentos: docs
          };
        }

        if (r.assina === 'sim') {
          return {
            nivel: 'alta',
            titulo: 'O caminho é direto',
            caminho: 'Escritura e registro',
            explicacao: 'O vendedor é o dono registrado, o preço foi pago e ele pode assinar: basta formalizar a escritura no cartório de notas e registrá-la na matrícula. Lembre que só o registro transfere o imóvel.',
            passos: [
              'Tirar certidões atualizadas do imóvel e do vendedor',
              'Recolher o ITBI na Prefeitura',
              'Assinar a escritura no cartório de notas',
              'Registrar a escritura no Registro de Imóveis'
            ],
            documentos: docs
          };
        }

        return {
          nivel: 'alta',
          titulo: 'Bons indícios para obrigar a transferência',
          caminho: 'Adjudicação compulsória',
          explicacao: 'Quando a compra foi paga e o vendedor não pode ou não quer assinar a escritura, a adjudicação compulsória obriga a transferência. Desde 2022 ela também pode ser pedida diretamente no Registro de Imóveis, em certos casos. Se o vendedor faleceu, o pedido envolve os herdeiros ou o espólio.',
          passos: [
            'Reunir contrato, prova da quitação e documentos do imóvel',
            'Tentar notificar formalmente o vendedor ou seus herdeiros',
            'Apresentar o pedido em cartório ou na Justiça, conforme o caso',
            'Registrar a propriedade em seu nome'
          ],
          documentos: docs
        };
      }
    },

    /* ================================================================ */
    inventario: {
      rotulo: 'Herdei um imóvel e o inventário nunca foi feito',
      perguntas: [
        {
          id: 'nome',
          texto: 'O imóvel está registrado no nome de quem faleceu?',
          opcoes: [
            { v: 'sim',    t: 'Sim' },
            { v: 'nao',    t: 'Não — estava em nome de outra pessoa ou só em contrato' },
            { v: 'naosei', t: 'Não sei' }
          ]
        },
        {
          id: 'acordo',
          se: quando('nome', 'sim'),
          texto: 'Todos os herdeiros estão de acordo com a divisão?',
          opcoes: [
            { v: 'sim', t: 'Sim, todos concordam' },
            { v: 'nao', t: 'Não, há desacordo' }
          ]
        },
        {
          id: 'incapaz',
          se: todas(quando('nome', 'sim'), quando('acordo', 'sim')),
          texto: 'Algum herdeiro é menor de idade ou incapaz?',
          opcoes: [
            { v: 'nao', t: 'Não' },
            { v: 'sim', t: 'Sim' }
          ]
        },
        {
          id: 'testamento',
          se: todas(quando('nome', 'sim'), quando('acordo', 'sim')),
          texto: 'A pessoa que faleceu deixou testamento?',
          opcoes: [
            { v: 'nao',    t: 'Não' },
            { v: 'sim',    t: 'Sim' },
            { v: 'naosei', t: 'Não sei' }
          ]
        }
      ],

      resultado: function (r) {
        var docs = [
          'Certidão de óbito',
          'Documentos pessoais e certidões de todos os herdeiros',
          'Certidão atualizada da matrícula do imóvel',
          'Carnê de IPTU ou ITR com o valor venal',
          'Testamento, se houver'
        ];
        var passos = [
          'Reunir documentos da pessoa falecida, dos herdeiros e do imóvel',
          'Levantar bens, dívidas e o valor do imóvel',
          'Calcular e recolher o imposto de herança (ITCMD)',
          'Fazer a escritura de inventário ou a ação judicial',
          'Registrar a partilha na matrícula do imóvel'
        ];
        var alerta = 'Inventário aberto fora do prazo legal pode gerar multa sobre o imposto, conforme a lei de cada estado.';

        if (r.nome === 'nao') {
          return {
            nivel: 'atencao',
            titulo: 'Antes do inventário, é preciso resolver o registro',
            caminho: 'Regularização do imóvel e inventário',
            explicacao: 'Se o imóvel não está no nome de quem faleceu, o inventário sozinho não o transfere aos herdeiros. É preciso resolver antes — ou junto — a situação do registro: escritura nunca registrada, contrato de gaveta ou usucapião.',
            passos: [
              'Levantar a matrícula e descobrir em nome de quem o imóvel está',
              'Reunir o documento que a pessoa falecida tinha do imóvel',
              'Definir como regularizar: registro, adjudicação ou usucapião',
              'Incluir o imóvel no inventário e registrar a partilha'
            ],
            documentos: docs,
            alerta: alerta
          };
        }

        if (r.nome === 'naosei') {
          return {
            nivel: 'media',
            titulo: 'Comece pela matrícula',
            caminho: 'Levantamento da matrícula e inventário',
            explicacao: 'Saber em nome de quem o imóvel está registrado define se o inventário resolve sozinho ou se é preciso regularizar o imóvel antes.',
            passos: ['Pedir a certidão atualizada da matrícula'].concat(passos),
            documentos: docs,
            alerta: alerta
          };
        }

        if (r.acordo === 'nao') {
          return {
            nivel: 'media',
            titulo: 'Possível pela via judicial',
            caminho: 'Inventário judicial',
            explicacao: 'Sem acordo entre os herdeiros, o inventário tramita na Justiça, onde a partilha é decidida. Leva mais tempo — e, muitas vezes, parte do desacordo se resolve quando a situação é explicada com documentos na mesa.',
            passos: passos,
            documentos: docs,
            alerta: alerta
          };
        }

        if (r.incapaz === 'nao' && r.testamento === 'nao') {
          return {
            nivel: 'alta',
            titulo: 'Bons indícios para fazer em cartório',
            caminho: 'Inventário extrajudicial',
            explicacao: 'Com os herdeiros de acordo e todos maiores e capazes, o inventário pode ser feito por escritura pública em cartório, com advogado — em regra, bem mais rápido que o judicial.',
            passos: passos,
            documentos: docs,
            alerta: alerta
          };
        }

        return {
          nivel: 'media',
          titulo: 'Possível — a via depende do caso',
          caminho: 'Inventário em cartório ou judicial',
          explicacao: 'Normas recentes passaram a admitir o inventário em cartório em algumas situações com testamento ou com herdeiro menor, desde que atendidas exigências adicionais. É o exame do caso que define a via.',
          passos: passos,
          documentos: docs,
          alerta: alerta
        };
      }
    },

    /* ================================================================ */
    compra: {
      rotulo: 'Vou comprar um imóvel e quero comprar com segurança',
      perguntas: [
        {
          id: 'pagamento',
          texto: 'Como você pretende pagar?',
          opcoes: [
            { v: 'financiamento', t: 'Com financiamento bancário' },
            { v: 'avista',        t: 'À vista' },
            { v: 'parcelado',     t: 'Parcelado direto com o vendedor' }
          ]
        },
        {
          id: 'estado',
          texto: 'O imóvel está pronto ou ainda vai ser construído?',
          opcoes: [
            { v: 'pronto', t: 'Está pronto' },
            { v: 'planta', t: 'É na planta ou está em obra' }
          ]
        },
        {
          id: 'matricula',
          texto: 'Você já viu a certidão de matrícula atualizada, emitida há poucos dias?',
          opcoes: [
            { v: 'sim', t: 'Sim' },
            { v: 'nao', t: 'Ainda não' }
          ]
        },
        {
          id: 'sinal',
          texto: 'Você já pagou sinal ou assinou algum documento?',
          opcoes: [
            { v: 'nao', t: 'Ainda não' },
            { v: 'sim', t: 'Sim' }
          ]
        }
      ],

      resultado: function (r) {
        var passos = [
          'Tirar a certidão atualizada da matrícula e verificar dívidas e restrições',
          'Levantar as certidões do vendedor: ações, execuções e dívidas',
          'Conferir IPTU e, em condomínio, a quitação das taxas',
          'Verificar se a construção está averbada na matrícula'
        ];

        if (r.estado === 'planta') {
          passos.push('Conferir o registro da incorporação e se há patrimônio de afetação');
        }
        if (r.pagamento === 'financiamento') {
          passos.push('Acompanhar a avaliação do banco e revisar o contrato de alienação fiduciária');
        }
        if (r.pagamento === 'parcelado') {
          passos.push('Estruturar no contrato garantias para quem vende e para quem compra');
        }
        passos.push('Revisar o contrato antes de assinar');
        passos.push('Recolher o ITBI, assinar a escritura e registrar na matrícula');

        var alertas = [];
        if (r.matricula === 'nao') alertas.push('Não pague nada antes de ver a matrícula atualizada.');
        if (r.pagamento === 'parcelado') alertas.push('Na compra parcelada direto com o vendedor, a escritura normalmente só sai no fim: o contrato precisa proteger você durante todo o período.');

        return {
          nivel: 'momento',
          titulo: r.sinal === 'sim'
            ? 'Ainda dá tempo — priorize a verificação'
            : 'Você está no melhor momento para verificar',
          caminho: 'Análise do imóvel antes da compra',
          explicacao: r.sinal === 'sim'
            ? 'Antes de pagar qualquer outra parcela, verifique a documentação do imóvel e do vendedor, e revise o que já foi assinado. Ainda há margem para corrigir o rumo.'
            : 'Antes do sinal, qualquer problema encontrado ainda é informação para negociar — ou para desistir sem prejuízo. Depois de pagar, vira discussão.',
          passos: passos,
          documentos: [
            'Anúncio ou proposta com os dados do imóvel',
            'Nome completo e CPF ou CNPJ do vendedor',
            'Número da matrícula e o cartório de registro, se souber',
            'Minuta do contrato, se já existir',
            'Comprovante de qualquer valor já pago'
          ],
          alerta: alertas.join(' ')
        };
      }
    },

    /* ================================================================ */
    construtora: {
      rotulo: 'A construtora atrasou a entrega do meu imóvel',
      perguntas: [
        {
          id: 'tolerancia',
          texto: 'Já passaram mais de 180 dias da data de entrega prevista no contrato?',
          ajuda: 'Muitos contratos preveem até 180 dias de tolerância além da data combinada.',
          opcoes: [
            { v: 'sim',    t: 'Sim, já passou' },
            { v: 'nao',    t: 'Ainda não' },
            { v: 'naosei', t: 'Não sei a data prevista' }
          ]
        },
        {
          id: 'chaves',
          se: quando('tolerancia', 'sim'),
          texto: 'Você já recebeu as chaves?',
          opcoes: [
            { v: 'nao', t: 'Ainda não' },
            { v: 'sim', t: 'Sim, já recebi' }
          ]
        },
        {
          id: 'quer',
          se: todas(quando('tolerancia', 'sim'), quando('chaves', 'nao')),
          texto: 'Você ainda quer ficar com o imóvel?',
          opcoes: [
            { v: 'sim', t: 'Sim, quero o imóvel' },
            { v: 'nao', t: 'Não, quero desfazer o negócio' }
          ]
        }
      ],

      resultado: function (r) {
        var docs = [
          'Contrato completo, com anexos e quadro-resumo',
          'Comprovantes de todos os pagamentos',
          'Mensagens, e-mails e protocolos com a construtora',
          'Contrato e recibos de aluguel pagos durante o atraso',
          'Termo de vistoria ou de entrega, se já assinou'
        ];
        var alerta = 'Não formalize como "desistência" um caso que é atraso da construtora: isso pode custar a devolução integral.';

        if (r.tolerancia === 'naosei') {
          return {
            nivel: 'media',
            titulo: 'O primeiro passo é achar a data no contrato',
            caminho: 'Localizar a data prevista e a cláusula de tolerância',
            explicacao: 'Tudo depende da data em que o atraso começa a contar: a data de entrega prevista no contrato somada ao prazo de tolerância. Com ela em mãos, o caminho fica claro.',
            passos: [
              'Localizar no contrato a data prevista de entrega',
              'Localizar a cláusula de tolerância e calcular quando ela termina',
              'Documentar a situação atual da obra e a comunicação com a construtora'
            ],
            documentos: docs
          };
        }

        if (r.tolerancia === 'nao') {
          return {
            nivel: 'media',
            titulo: 'Ainda dentro do prazo de tolerância',
            caminho: 'Documentar e acompanhar o prazo',
            explicacao: 'Em regra, até 180 dias além da data prevista ainda não há atraso jurídico. Use esse tempo para documentar a situação e marque a data exata em que o prazo termina.',
            passos: [
              'Calcular a data exata em que termina a tolerância',
              'Guardar comunicações e registrar o andamento da obra',
              'Guardar recibos de aluguel pagos enquanto espera'
            ],
            documentos: docs
          };
        }

        if (r.chaves === 'sim') {
          return {
            nivel: 'media',
            titulo: 'Ainda há o que discutir — depende do termo assinado',
            caminho: 'Indenização pelo atraso após a entrega',
            explicacao: 'Receber as chaves não apaga o atraso. Mas o termo de entrega assinado pode ter efeitos sobre o que ainda se pode pedir, e precisa ser analisado.',
            passos: [
              'Reunir o termo de entrega e o contrato',
              'Calcular o período de atraso depois da tolerância',
              'Avaliar a indenização cabível no seu caso'
            ],
            documentos: docs
          };
        }

        if (r.quer === 'sim') {
          return {
            nivel: 'alta',
            titulo: 'Bons indícios para indenização pelo atraso',
            caminho: 'Manter o contrato e buscar indenização',
            explicacao: 'Passada a tolerância, a construtora está em atraso. Mantendo o contrato, é possível buscar indenização pelo período — inclusive pelo que você deixou de usufruir, como o aluguel pago enquanto esperava.',
            passos: [
              'Calcular o período de atraso depois da tolerância',
              'Reunir a prova do prejuízo, como os recibos de aluguel',
              'Notificar a construtora e buscar acordo ou ação judicial'
            ],
            documentos: docs,
            alerta: 'Ao receber as chaves, registre ressalva por escrito sobre o atraso.'
          };
        }

        return {
          nivel: 'alta',
          titulo: 'Bons indícios para desfazer com devolução integral',
          caminho: 'Resolução do contrato por atraso da construtora',
          explicacao: 'Quando o atraso é da construtora, o comprador pode desfazer o contrato e receber de volta o que pagou, corrigido — sem as retenções do distrato por desistência.',
          passos: [
            'Confirmar a data em que o atraso se configurou',
            'Somar tudo o que foi pago, com comprovantes',
            'Notificar a construtora e buscar acordo ou ação judicial'
          ],
          documentos: docs,
          alerta: alerta
        };
      }
    },

    /* ================================================================ */
    posse: {
      rotulo: 'O inquilino não paga ou ocuparam o meu imóvel',
      perguntas: [
        {
          id: 'tipo',
          texto: 'O que está acontecendo?',
          opcoes: [
            { v: 'inquilino', t: 'Tenho um inquilino que não paga ou não sai' },
            { v: 'invasao',   t: 'Ocuparam o imóvel sem autorização' },
            { v: 'emprestimo', t: 'Emprestei ou cedi o imóvel e não devolvem' }
          ]
        },
        {
          id: 'contrato',
          se: function (r) { return r.tipo === 'inquilino'; },
          texto: 'O aluguel tem contrato escrito?',
          opcoes: [
            { v: 'sim', t: 'Sim' },
            { v: 'nao', t: 'Não, foi combinado de boca' }
          ]
        },
        {
          id: 'garantia',
          se: function (r) { return r.tipo === 'inquilino' && r.contrato === 'sim'; },
          texto: 'O contrato tem fiador, caução ou seguro-fiança?',
          opcoes: [
            { v: 'sim', t: 'Sim, tem garantia' },
            { v: 'nao', t: 'Não tem nenhuma garantia' }
          ]
        },
        {
          id: 'quando',
          se: function (r) { return r.tipo === 'invasao'; },
          texto: 'Há quanto tempo ocuparam o imóvel?',
          opcoes: [
            { v: 'recente', t: 'Menos de 1 ano e 1 dia' },
            { v: 'antiga',  t: 'Mais de 1 ano e 1 dia' }
          ]
        },
        {
          id: 'notificou',
          se: function (r) { return r.tipo === 'emprestimo'; },
          texto: 'Você já pediu a devolução por escrito, com prazo?',
          opcoes: [
            { v: 'sim', t: 'Sim, já notifiquei' },
            { v: 'nao', t: 'Ainda não' }
          ]
        }
      ],

      resultado: function (r) {
        var docsBase = [
          'Matrícula, escritura ou documento que prove a sua posse ou propriedade',
          'Fotos e vídeos atuais do imóvel',
          'Mensagens e conversas com quem está no imóvel'
        ];

        if (r.tipo === 'inquilino') {
          var docsLoc = ['Contrato de locação, se houver', 'Recibos e comprovantes dos aluguéis pagos e dos atrasados'].concat(docsBase);

          if (r.contrato === 'nao') {
            return {
              nivel: 'media',
              titulo: 'Possível — a locação precisa ser provada',
              caminho: 'Ação de despejo com prova da locação',
              explicacao: 'Sem contrato escrito a locação continua existindo, mas precisa ser demonstrada por recibos, transferências bancárias e mensagens. Com essa prova, cabe a ação de despejo.',
              passos: [
                'Reunir comprovantes de pagamento e mensagens sobre o aluguel',
                'Calcular os valores em atraso',
                'Ajuizar a ação de despejo e de cobrança'
              ],
              documentos: docsLoc
            };
          }

          return {
            nivel: 'alta',
            titulo: 'Bons indícios para a ação de despejo',
            caminho: 'Ação de despejo',
            explicacao: 'Falta de pagamento ou fim do contrato permitem a ação de despejo. ' +
              (r.garantia === 'nao'
                ? 'Quando o contrato não tem nenhuma garantia, a lei prevê a possibilidade de pedir a desocupação liminar logo no início do processo, mediante caução.'
                : 'Como há garantia, o fiador ou a garantia também podem responder pelos valores em atraso.'),
            passos: [
              'Calcular os aluguéis e encargos em atraso',
              'Reunir contrato e comprovantes',
              'Ajuizar a ação de despejo, com cobrança dos valores',
              r.garantia === 'nao' ? 'Pedir a desocupação liminar, oferecendo a caução exigida' : 'Incluir a cobrança contra o fiador ou acionar a garantia'
            ],
            documentos: docsLoc
          };
        }

        if (r.tipo === 'invasao') {
          var docsInv = ['Boletim de ocorrência sobre a ocupação'].concat(docsBase, ['Nome de testemunhas que viram a ocupação acontecer']);

          if (r.quando === 'recente') {
            return {
              nivel: 'alta',
              titulo: 'Bons indícios para retomar com liminar',
              caminho: 'Reintegração de posse com pedido de liminar',
              explicacao: 'Quando a ocupação tem menos de ano e dia, a reintegração de posse segue o procedimento que permite pedir a retomada do imóvel já no início do processo, desde que se provem a sua posse anterior e a data da ocupação.',
              passos: [
                'Registrar boletim de ocorrência, se ainda não fez',
                'Reunir a prova da sua posse antes da ocupação',
                'Provar a data da ocupação — fotos, testemunhas, mensagens',
                'Ajuizar a reintegração de posse com pedido de liminar'
              ],
              documentos: docsInv,
              alerta: 'Evite retomar o imóvel por conta própria: além do risco, isso pode prejudicar o seu direito.'
            };
          }

          return {
            nivel: 'media',
            titulo: 'Possível — e o tempo joga contra',
            caminho: 'Reintegração de posse',
            explicacao: 'Passado ano e dia, a ação segue o procedimento comum. Ainda é possível pedir medida de urgência, mas a prova precisa ser mais forte.',
            passos: [
              'Reunir a prova da sua posse antes da ocupação',
              'Documentar a situação atual do imóvel',
              'Ajuizar a reintegração de posse sem demora'
            ],
            documentos: docsInv,
            alerta: 'Quanto mais tempo passa, maior o risco de a ocupação ser usada para alegar usucapião. Não deixe correr.'
          };
        }

        // empréstimo
        if (r.notificou === 'nao') {
          return {
            nivel: 'media',
            titulo: 'Primeiro notificar, depois retomar',
            caminho: 'Notificação e reintegração de posse',
            explicacao: 'No empréstimo de imóvel, o primeiro passo é pedir a devolução por escrito, com prazo. Vencido o prazo sem devolução, a permanência passa a ser indevida e cabe a reintegração de posse.',
            passos: [
              'Enviar notificação escrita com prazo para devolução',
              'Guardar o comprovante de recebimento',
              'Vencido o prazo, ajuizar a reintegração de posse'
            ],
            documentos: docsBase
          };
        }

        return {
          nivel: 'alta',
          titulo: 'Bons indícios para a reintegração de posse',
          caminho: 'Reintegração de posse',
          explicacao: 'Se a devolução já foi pedida por escrito e o prazo venceu, a permanência passou a ser indevida. Cabe a reintegração de posse — com possibilidade de liminar, conforme a data em que o prazo venceu.',
          passos: [
            'Reunir a notificação e o comprovante de recebimento',
            'Reunir a prova da sua posse ou propriedade',
            'Ajuizar a reintegração de posse'
          ],
          documentos: ['Notificação enviada e comprovante de recebimento'].concat(docsBase)
        };
      }
    },

    /* ================================================================ */
    averbacao: {
      rotulo: 'Minha casa existe, mas não aparece na matrícula',
      perguntas: [
        {
          id: 'terreno',
          texto: 'O terreno está registrado no seu nome?',
          opcoes: [
            { v: 'sim',    t: 'Sim' },
            { v: 'nao',    t: 'Não' },
            { v: 'naosei', t: 'Não sei' }
          ]
        },
        {
          id: 'habitese',
          se: quando('terreno', 'sim'),
          texto: 'A construção tem projeto aprovado ou habite-se na Prefeitura?',
          opcoes: [
            { v: 'sim',    t: 'Sim' },
            { v: 'nao',    t: 'Não' },
            { v: 'naosei', t: 'Não sei' }
          ]
        },
        {
          id: 'ampliou',
          se: quando('terreno', 'sim'),
          texto: 'A casa foi ampliada depois da construção original?',
          opcoes: [
            { v: 'nao', t: 'Não' },
            { v: 'sim', t: 'Sim, foi ampliada' }
          ]
        }
      ],

      resultado: function (r) {
        var docs = [
          'Certidão atualizada da matrícula',
          'Carnê de IPTU com a área construída cadastrada',
          'Projeto, planta ou habite-se, se houver',
          'Fotos da construção',
          'Notas e comprovantes da obra, se tiver'
        ];
        var passos = [
          'Conferir a matrícula e o cadastro do imóvel na Prefeitura',
          'Fazer o levantamento da construção com profissional habilitado',
          'Obter a aprovação ou a regularização da obra na Prefeitura',
          'Reunir as certidões exigidas, inclusive a da obra perante a Receita Federal',
          'Averbar a construção no Registro de Imóveis'
        ];

        if (r.terreno === 'nao') {
          return {
            nivel: 'atencao',
            titulo: 'Primeiro a propriedade, depois a construção',
            caminho: 'Regularizar o terreno antes da averbação',
            explicacao: 'A averbação da construção é feita por quem é dono do terreno no registro. Antes, é preciso resolver a propriedade — por escritura, adjudicação ou usucapião — e só então averbar a casa.',
            passos: [
              'Descobrir em nome de quem o terreno está registrado',
              'Definir o caminho para passar o terreno ao seu nome',
              'Registrar a propriedade',
              'Averbar a construção'
            ],
            documentos: docs
          };
        }

        if (r.terreno === 'naosei') {
          return {
            nivel: 'media',
            titulo: 'Comece pela matrícula',
            caminho: 'Levantamento da matrícula e averbação',
            explicacao: 'Saber se o terreno está no seu nome define se o caminho é direto ou se é preciso regularizar a propriedade antes.',
            passos: ['Pedir a certidão atualizada da matrícula'].concat(passos),
            documentos: docs
          };
        }

        if (r.habitese === 'sim' && r.ampliou === 'nao') {
          return {
            nivel: 'alta',
            titulo: 'O caminho é direto',
            caminho: 'Averbação da construção',
            explicacao: 'Com o terreno no seu nome e a obra aprovada, basta reunir os documentos e averbar a construção na matrícula. A partir daí, a casa passa a existir também no registro.',
            passos: [
              'Reunir habite-se e documentos da obra',
              'Obter as certidões exigidas, inclusive a da obra perante a Receita Federal',
              'Averbar a construção no Registro de Imóveis'
            ],
            documentos: docs
          };
        }

        return {
          nivel: 'media',
          titulo: r.ampliou === 'sim' ? 'Possível — a ampliação também precisa ser regularizada' : 'Possível — começa pela Prefeitura',
          caminho: 'Regularização na Prefeitura e averbação',
          explicacao: 'Sem projeto aprovado, ou com ampliação feita depois, é preciso primeiro regularizar a construção junto à Prefeitura — o que depende de a obra respeitar as regras do município — e depois averbar.',
          passos: passos,
          documentos: docs
        };
      }
    }
  };

  /* ------------------------------------------------------------------------
     Textos do medidor
     ------------------------------------------------------------------------ */
  var NIVEIS = {
    alta:    { rotulo: 'Bons indícios',                     barras: 3 },
    media:   { rotulo: 'Possível — depende dos documentos', barras: 2 },
    atencao: { rotulo: 'Exige análise cuidadosa',           barras: 1 },
    momento: { rotulo: 'Momento certo para agir',           barras: 3 }
  };

  /* ------------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------------ */
  var estado = { fluxo: null, respostas: {}, pos: 0 };
  var raiz = document.getElementById('jogo');
  if (!raiz) return;

  function perguntasAtivas() {
    var f = FLUXOS[estado.fluxo];
    if (!f) return [];
    return f.perguntas.filter(function (p) {
      return typeof p.se !== 'function' || p.se(estado.respostas);
    });
  }

  function opcoesDe(pergunta) {
    return typeof pergunta.opcoes === 'function' ? pergunta.opcoes(estado.respostas) : pergunta.opcoes;
  }

  /* Total exibido no contador: o caminho mais longo ainda possível a partir
     das respostas já dadas. Assim o número nunca "salta" para cima — no
     máximo o jogo termina antes do previsto. */
  function totalEstimado() {
    var f = FLUXOS[estado.fluxo];
    var ativas = perguntasAtivas();
    var base = {};
    ativas.slice(0, estado.pos).forEach(function (p) { base[p.id] = estado.respostas[p.id]; });

    var maior = 0;
    (function percorrer(r) {
      var visiveis = f.perguntas.filter(function (p) { return typeof p.se !== 'function' || p.se(r); });
      var pendente = visiveis.filter(function (p) { return !(p.id in r); })[0];
      if (!pendente) { maior = Math.max(maior, visiveis.length); return; }
      var ops = typeof pendente.opcoes === 'function' ? pendente.opcoes(r) : pendente.opcoes;
      ops.forEach(function (o) {
        var r2 = {};
        for (var k in r) r2[k] = r[k];
        r2[pendente.id] = o.v;
        percorrer(r2);
      });
    })(base);

    return Math.max(maior, estado.pos + 1);
  }

  function limparRespostasApos(indice) {
    var ativas = perguntasAtivas();
    for (var i = indice + 1; i < ativas.length; i++) delete estado.respostas[ativas[i].id];
  }

  /* ------------------------------------------------------------------------
     Utilitários de tela
     ------------------------------------------------------------------------ */
  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  var LETRAS = 'ABCDEFGH';

  function trocarTela(conteudo) {
    raiz.innerHTML = '';
    raiz.appendChild(conteudo);
    var foco = raiz.querySelector('[data-foco]');
    if (foco) {
      foco.setAttribute('tabindex', '-1');
      foco.focus({ preventScroll: true });
    }
    var topo = raiz.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > topo) window.scrollTo(0, topo);
  }

  function linkWhatsapp(texto) {
    var numero = ((cfg.contato && cfg.contato.whatsapp) || '').replace(/\D/g, '');
    if (!numero) return null;
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ------------------------------------------------------------------------
     Tela 1 — abertura
     ------------------------------------------------------------------------ */
  function telaAbertura() {
    var t = el('div', 'jogo__tela jogo__tela--abertura');

    var selo = el('span', 'jogo__selo', '2 minutos · sem cadastro');
    var h = el('h2', 'jogo__titulo', 'Descubra o caminho do seu imóvel');
    h.setAttribute('data-foco', '');
    var p = el('p', 'jogo__texto',
      'Responda algumas perguntas simples. No final você vê o caminho mais provável, ' +
      'a viabilidade indicada, o passo a passo e os documentos para separar.');

    var lista = el('ul', 'jogo__vantagens');
    ['O caminho jurídico provável para o seu caso',
     'Um medidor de viabilidade',
     'O passo a passo, do começo ao registro',
     'A lista de documentos para separar'].forEach(function (txt) {
      lista.appendChild(el('li', null, txt));
    });

    var botao = el('button', 'botao botao--ouro botao--pilula jogo__comecar', 'Começar');
    botao.type = 'button';
    botao.addEventListener('click', telaSituacao);

    t.appendChild(selo);
    t.appendChild(h);
    t.appendChild(p);
    t.appendChild(lista);
    t.appendChild(botao);
    trocarTela(t);
  }

  /* ------------------------------------------------------------------------
     Tela 2 — escolha da situação
     ------------------------------------------------------------------------ */
  function telaSituacao() {
    estado.fluxo = null;
    estado.respostas = {};
    estado.pos = 0;

    var t = el('div', 'jogo__tela');
    t.appendChild(el('span', 'jogo__passo', 'Primeiro passo'));
    var h = el('h2', 'jogo__pergunta', 'Qual situação parece mais com a sua?');
    h.setAttribute('data-foco', '');
    t.appendChild(h);

    var grade = el('div', 'jogo__opcoes jogo__opcoes--situacao');
    Object.keys(FLUXOS).forEach(function (chave, i) {
      var b = el('button', 'jogo__opcao');
      b.type = 'button';
      b.appendChild(el('span', 'jogo__letra', LETRAS[i]));
      b.appendChild(el('span', 'jogo__opcao-texto', FLUXOS[chave].rotulo));
      b.addEventListener('click', function () {
        estado.fluxo = chave;
        telaPergunta();
      });
      grade.appendChild(b);
    });
    t.appendChild(grade);
    trocarTela(t);
  }

  /* ------------------------------------------------------------------------
     Tela 3 — perguntas
     ------------------------------------------------------------------------ */
  function telaPergunta() {
    var ativas = perguntasAtivas();
    if (estado.pos >= ativas.length) return telaResultado();

    var pergunta = ativas[estado.pos];
    var total = totalEstimado();

    var t = el('div', 'jogo__tela');

    var topo = el('div', 'jogo__progresso-topo');
    topo.appendChild(el('span', 'jogo__passo', 'Pergunta ' + (estado.pos + 1) + ' de ' + total));
    var voltar = el('button', 'jogo__voltar', '← Voltar');
    voltar.type = 'button';
    voltar.addEventListener('click', function () {
      if (estado.pos === 0) return telaSituacao();
      estado.pos--;
      telaPergunta();
    });
    topo.appendChild(voltar);
    t.appendChild(topo);

    var barra = el('div', 'jogo__barra');
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-valuemin', '0');
    barra.setAttribute('aria-valuemax', String(total));
    barra.setAttribute('aria-valuenow', String(estado.pos));
    var enchimento = el('span', 'jogo__barra-enchimento');
    enchimento.style.width = Math.round((estado.pos / total) * 100) + '%';
    barra.appendChild(enchimento);
    t.appendChild(barra);

    var h = el('h2', 'jogo__pergunta', pergunta.texto);
    h.setAttribute('data-foco', '');
    t.appendChild(h);
    if (pergunta.ajuda) t.appendChild(el('p', 'jogo__ajuda', pergunta.ajuda));

    var grade = el('div', 'jogo__opcoes');
    opcoesDe(pergunta).forEach(function (op, i) {
      var b = el('button', 'jogo__opcao');
      b.type = 'button';
      if (estado.respostas[pergunta.id] === op.v) b.classList.add('jogo__opcao--marcada');
      b.appendChild(el('span', 'jogo__letra', LETRAS[i]));
      b.appendChild(el('span', 'jogo__opcao-texto', op.t));
      b.addEventListener('click', function () {
        var anterior = estado.respostas[pergunta.id];
        estado.respostas[pergunta.id] = op.v;
        if (anterior !== op.v) limparRespostasApos(estado.pos);
        estado.pos++;
        telaPergunta();
      });
      grade.appendChild(b);
    });
    t.appendChild(grade);

    trocarTela(t);
  }

  /* ------------------------------------------------------------------------
     Tela 4 — resultado
     ------------------------------------------------------------------------ */
  function resumoRespostas() {
    return perguntasAtivas().map(function (p) {
      var escolhida = opcoesDe(p).filter(function (o) { return o.v === estado.respostas[p.id]; })[0];
      return { pergunta: p.texto, resposta: escolhida ? escolhida.t : '—' };
    });
  }

  function telaResultado() {
    var fluxo = FLUXOS[estado.fluxo];
    var res = fluxo.resultado(estado.respostas);
    var nivel = NIVEIS[res.nivel] || NIVEIS.media;

    var t = el('div', 'jogo__tela jogo__tela--resultado');

    t.appendChild(el('span', 'jogo__passo', 'Resultado da análise'));

    // Medidor
    var medidor = el('div', 'medidor medidor--' + res.nivel);
    medidor.setAttribute('role', 'img');
    medidor.setAttribute('aria-label', 'Viabilidade indicada: ' + nivel.rotulo);
    var barras = el('div', 'medidor__barras');
    for (var i = 1; i <= 3; i++) {
      var s = el('span', 'medidor__barra');
      if (i <= nivel.barras) s.classList.add('medidor__barra--acesa');
      barras.appendChild(s);
    }
    medidor.appendChild(barras);
    medidor.appendChild(el('span', 'medidor__rotulo', nivel.rotulo));
    t.appendChild(medidor);

    var h = el('h2', 'jogo__resultado-titulo', res.titulo);
    h.setAttribute('data-foco', '');
    t.appendChild(h);

    var caminho = el('p', 'jogo__caminho');
    caminho.appendChild(el('span', 'jogo__caminho-rotulo', 'Caminho provável'));
    caminho.appendChild(el('strong', null, res.caminho));
    t.appendChild(caminho);

    t.appendChild(el('p', 'jogo__explicacao', res.explicacao));

    if (res.alerta) {
      var alerta = el('p', 'jogo__alerta');
      alerta.appendChild(el('strong', null, 'Atenção: '));
      alerta.appendChild(document.createTextNode(res.alerta));
      t.appendChild(alerta);
    }

    // Passo a passo
    var blocoPassos = el('div', 'jogo__bloco');
    blocoPassos.appendChild(el('h3', 'jogo__bloco-titulo', 'Passo a passo'));
    var ol = el('ol', 'jogo__passos');
    res.passos.forEach(function (passo) { ol.appendChild(el('li', null, passo)); });
    blocoPassos.appendChild(ol);
    if (res.nota) blocoPassos.appendChild(el('p', 'jogo__nota', res.nota));
    t.appendChild(blocoPassos);

    // Documentos
    var blocoDocs = el('div', 'jogo__bloco');
    blocoDocs.appendChild(el('h3', 'jogo__bloco-titulo', 'Documentos para separar'));
    var ul = el('ul', 'jogo__documentos');
    res.documentos.forEach(function (d) { ul.appendChild(el('li', null, d)); });
    blocoDocs.appendChild(ul);
    t.appendChild(blocoDocs);

    // Chamada
    var resumo = resumoRespostas();
    var mensagem = [
      'Olá, Jocsan. Fiz a análise de viabilidade no site.',
      '',
      'Situação: ' + fluxo.rotulo,
      ''
    ].concat(resumo.map(function (x) { return '• ' + x.pergunta + ' ' + x.resposta; }))
     .concat(['', 'Caminho indicado: ' + res.caminho, '', 'Gostaria de conversar sobre o meu caso.'])
     .join('\n');

    var acoes = el('div', 'jogo__acoes');
    var wpp = linkWhatsapp(mensagem);
    if (wpp) {
      var a = el('a', 'botao botao--ouro botao--pilula', 'Enviar resultado ao advogado');
      a.href = wpp;
      a.target = '_blank';
      a.rel = 'noopener';
      acoes.appendChild(a);
    }
    var refazer = el('button', 'botao botao--contorno-escuro botao--pilula', 'Refazer a análise');
    refazer.type = 'button';
    refazer.addEventListener('click', telaSituacao);
    acoes.appendChild(refazer);
    t.appendChild(acoes);

    t.appendChild(el('p', 'jogo__aviso',
      'Resultado indicativo, gerado a partir das suas respostas. Não substitui a análise dos documentos, ' +
      'não constitui parecer jurídico e não representa promessa de resultado. Suas respostas não são ' +
      'enviadas a lugar nenhum, a menos que você mesmo decida mandá-las pelo WhatsApp.'));

    trocarTela(t);
  }

  /* ------------------------------------------------------------------------
     Início — permite abrir direto num caso: viabilidade/?caso=usucapiao
     ------------------------------------------------------------------------ */
  var parametro = new URLSearchParams(window.location.search).get('caso');
  if (parametro && FLUXOS[parametro]) {
    estado.fluxo = parametro;
    telaPergunta();
  } else {
    telaAbertura();
  }

  // Exposto apenas para teste automatizado
  window.__viabilidade = { FLUXOS: FLUXOS, NIVEIS: NIVEIS };
})();
