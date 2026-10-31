"""Gera os SVGs da marca Aguillera.

Todo o texto é convertido em contornos a partir das fontes do repositório
(assets/fonts), para que os arquivos não dependam de fonte instalada.

Uso:  pip install fonttools brotli
      python3 marca-aguillera/gerar.py
"""
import math
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(AQUI, '..', 'assets', 'fonts')

VERDE = '#0B3D2E'
VERDE_ESCURO = '#06281F'
ESMERALDA = '#1E8A5A'
ESMERALDA_CLARA = '#4FBF8B'
OURO = '#C8A84E'
OURO_CLARO = '#E7D08A'
OURO_ESCURO = '#9C7C2E'
PENA = '#F6F3EA'


# --------------------------------------------------------------------------
# Texto em contornos
# --------------------------------------------------------------------------
class Fonte:
    def __init__(self, arquivo):
        self.f = TTFont(os.path.join(FONTES, arquivo))
        self.glifos = self.f.getGlyphSet()
        self.cmap = self.f.getBestCmap()
        self.upm = self.f['head'].unitsPerEm

    def nome(self, ch):
        return self.cmap[ord(ch)]

    def avanco(self, ch, tamanho):
        return self.glifos[self.nome(ch)].width * tamanho / self.upm

    def largura(self, texto, tamanho, espaco):
        return sum(self.avanco(c, tamanho) for c in texto) + espaco * (len(texto) - 1)

    def glifo(self, ch, transformacao):
        pen = SVGPathPen(self.glifos)
        self.glifos[self.nome(ch)].draw(TransformPen(pen, transformacao))
        return pen.getCommands()

    def linha(self, texto, x, y, tamanho, espaco=0, alinhar='inicio'):
        """Texto horizontal; y é a linha de base."""
        if alinhar == 'meio':
            x -= self.largura(texto, tamanho, espaco) / 2
        k = tamanho / self.upm
        partes = []
        for c in texto:
            if c != ' ':
                partes.append(self.glifo(c, (k, 0, 0, -k, x, y)))
            x += self.avanco(c, tamanho) + espaco
        return ' '.join(partes)

    def arco(self, texto, cx, cy, raio, tamanho, espaco=0, embaixo=False):
        """Texto centrado no topo (ou na base) de um círculo."""
        total = self.largura(texto, tamanho, espaco)
        k = tamanho / self.upm
        partes = []
        s = -total / 2
        for c in texto:
            meio = s + self.avanco(c, tamanho) / 2
            if embaixo:
                ang = math.pi / 2 - meio / raio          # da esquerda para a direita, por baixo
                rot = ang - math.pi / 2
            else:
                ang = -math.pi / 2 + meio / raio
                rot = ang + math.pi / 2
            px, py = cx + raio * math.cos(ang), cy + raio * math.sin(ang)
            cr, sr = math.cos(rot), math.sin(rot)
            dx = -self.avanco(c, tamanho) / 2
            # escala com y invertido, centraliza o glifo, gira e posiciona
            a, b = k * cr, k * sr
            cc, d = k * sr, -k * cr
            e = px + dx * cr
            f = py + dx * sr
            if c != ' ':
                partes.append(self.glifo(c, (a, b, cc, d, e, f)))
            s += self.avanco(c, tamanho) + espaco
        return ' '.join(partes)


GARAMOND = Fonte('eb-garamond-600.woff2')
FRANKLIN = Fonte('libre-franklin-600.woff2')


# --------------------------------------------------------------------------
# Símbolo — cabeça de harpia em gravura, olho verde
# --------------------------------------------------------------------------
FORMA = ('M64 192 C58 160 58 134 66 110 C46 108 24 96 8 76 C30 82 52 86 72 92 '
         'C54 76 36 52 28 24 C48 46 70 66 90 78 C82 56 78 34 82 8 C92 34 104 56 112 68 '
         'C126 63 140 64 150 70 C157 74 162 80 166 86 C182 88 195 100 195 116 '
         'C195 127 191 135 184 142 C186 131 182 125 174 123 C166 125 158 127 150 127 '
         'C140 142 132 162 130 192 Z')

GRAVURA = [
    # nervuras do penacho
    'M69 101 C50 96 30 88 13 78', 'M70 96 C56 93 42 88 30 83',
    'M83 84 C65 66 45 46 31 28', 'M86 80 C74 70 62 58 52 46',
    'M100 71 C93 52 86 32 83 12', 'M104 69 C99 58 95 46 92 34',
    # disco facial
    'M114 70 C101 92 103 121 121 141',
    # plumagem do pescoço
    'M72 128 C78 124 86 124 92 128', 'M70 142 C77 138 86 138 93 142',
    'M70 156 C78 152 88 152 96 156', 'M100 136 C106 132 113 132 118 136',
    'M102 150 C109 146 117 146 123 150',
]


def simbolo(fill='url(#ouro)', gravura=OURO_ESCURO, detalhe=VERDE_ESCURO, olho=ESMERALDA,
            brilho_bico=OURO_CLARO, colar=VERDE, fio_colar=OURO):
    linhas = ''.join(f'<path d="{d}"/>' for d in GRAVURA)
    return f'''<path fill="{fill}" d="{FORMA}"/>
  <g fill="none" stroke="{gravura}" stroke-width="1.3" stroke-linecap="round" opacity=".75">{linhas}</g>
  <path d="M168 90 C181 94 189 104 191 118" fill="none" stroke="{brilho_bico}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
  <path d="M167 93 C164 99 162 105 161 111" fill="none" stroke="{detalhe}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M118 86 C133 79 152 81 165 90 C150 89 137 92 127 100 Z" fill="{detalhe}"/>
  <circle cx="146" cy="100" r="7" fill="{olho}" stroke="{detalhe}" stroke-width="1.8"/>
  <circle cx="146" cy="100" r="2.8" fill="{detalhe}"/>
  <circle cx="148.3" cy="97.6" r="1.4" fill="#FFFFFF"/>
  <path d="M60 170 C84 159 112 159 136 167 L134 192 L64 192 Z" fill="{colar}"/>
  <path d="M60 170 C84 159 112 159 136 167" fill="none" stroke="{fio_colar}" stroke-width="1.2"/>'''


DEFS = f'''<defs>
    <linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{OURO_CLARO}"/><stop offset=".55" stop-color="{OURO}"/><stop offset="1" stop-color="{OURO_ESCURO}"/>
    </linearGradient>
  </defs>'''


def svg(vb, corpo, titulo):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-labelledby="t">
  <title id="t">{titulo}</title>
  {DEFS}
  {corpo}
</svg>
'''


def losango(x, y, r, cor):
    return f'<path d="M{x} {y - r} L{x + r} {y} L{x} {y + r} L{x - r} {y} Z" fill="{cor}"/>'


def assinatura(x, y, cor_nome, cor_desc, tamanho=74, alinhar='inicio'):
    """AGUILLERA com fios e losango sobre ADVOCACIA."""
    esp = tamanho * .14
    larg = GARAMOND.largura('AGUILLERA', tamanho, esp)
    x0 = x - larg / 2 if alinhar == 'meio' else x
    nome = GARAMOND.linha('AGUILLERA', x0, y, tamanho, esp)
    td = tamanho * .25
    espd = td * .55
    largd = FRANKLIN.largura('ADVOCACIA', td, espd)
    meio = x0 + larg / 2
    yd = y + tamanho * .62
    desc = FRANKLIN.linha('ADVOCACIA', meio, yd, td, espd, 'meio')
    yf = yd - td * .36
    gap = td * 1.1
    fios = (f'<path d="M{x0} {yf} H{meio - largd / 2 - gap} M{meio + largd / 2 + gap} {yf} H{x0 + larg}" '
            f'stroke="{cor_desc}" stroke-width="1.1"/>'
            + losango(x0, yf, 2.6, cor_desc) + losango(x0 + larg, yf, 2.6, cor_desc))
    return (f'<path fill="{cor_nome}" d="{nome}"/><path fill="{cor_desc}" d="{desc}"/>' + fios), larg


def selo(fundo=VERDE, linha=OURO, texto=OURO_CLARO):
    cx = cy = 200
    topo = GARAMOND.arco('AGUILLERA', cx, cy, 158, 30, 7)
    base = FRANKLIN.arco('ADVOCACIA', cx, cy, 175, 15, 6, embaixo=True)
    pontos = losango(cx - 166, cy, 4, linha) + losango(cx + 166, cy, 4, linha)
    return (f'<circle cx="{cx}" cy="{cy}" r="198" fill="{fundo}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="190" fill="none" stroke="{linha}" stroke-width="2"/>'
            f'<circle cx="{cx}" cy="{cy}" r="185" fill="none" stroke="{linha}" stroke-width=".8"/>'
            f'<circle cx="{cx}" cy="{cy}" r="144" fill="none" stroke="{linha}" stroke-width="1.2"/>'
            f'<path fill="{texto}" d="{topo}"/><path fill="{texto}" d="{base}"/>{pontos}'
            f'<clipPath id="medalha"><circle cx="{cx}" cy="{cy}" r="143"/></clipPath>'
            f'<g clip-path="url(#medalha)"><g transform="translate(74 66) scale(1.3)">'
            # o colar desce como busto até a borda da medalha
            f'{simbolo(colar=VERDE_ESCURO)}'
            f'<path d="M61 178 L136 178 L150 230 L50 230 Z" fill="{VERDE_ESCURO}"/></g></g>')


def gerar():
    arquivos = {}
    arquivos['simbolo.svg'] = svg('0 0 200 200', simbolo(), 'Aguillera — símbolo da harpia')
    arquivos['simbolo-monocromatico.svg'] = svg(
        '0 0 200 200',
        simbolo(fill=VERDE, gravura=PENA, detalhe='#FFFFFF', olho=VERDE, brilho_bico=PENA,
                colar=VERDE, fio_colar='#FFFFFF'),
        'Aguillera — símbolo monocromático')
    arquivos['selo.svg'] = svg('0 0 400 400', selo(), 'Aguillera Advocacia — selo')
    arquivos['avatar.svg'] = svg(
        '0 0 400 400',
        f'<circle cx="200" cy="200" r="200" fill="{VERDE}"/>'
        f'<circle cx="200" cy="200" r="186" fill="none" stroke="{OURO}" stroke-width="2.5"/>'
        f'<g transform="translate(66 58) scale(1.36)">{simbolo()}</g>',
        'Aguillera — avatar para redes sociais')

    corpo, larg = assinatura(222, 116, VERDE, OURO_ESCURO)
    w = math.ceil(222 + larg + 24)
    arquivos['logo-horizontal.svg'] = svg(
        f'0 0 {w} 200', f'<g transform="translate(4 4) scale(.96)">{simbolo()}</g>{corpo}',
        'Aguillera Advocacia — logotipo horizontal')
    corpo_n, _ = assinatura(222, 116, PENA, OURO_CLARO)
    arquivos['logo-horizontal-negativo.svg'] = svg(
        f'0 0 {w} 200',
        f'<rect width="{w}" height="200" fill="{VERDE}"/>'
        f'<g transform="translate(4 4) scale(.96)">{simbolo()}</g>{corpo_n}',
        'Aguillera Advocacia — logotipo horizontal em negativo')
    corpo_v, _ = assinatura(260, 318, VERDE, OURO_ESCURO, tamanho=62, alinhar='meio')
    arquivos['logo-vertical.svg'] = svg(
        '0 0 520 380', f'<g transform="translate(160 6) scale(1)">{simbolo()}</g>{corpo_v}',
        'Aguillera Advocacia — logotipo vertical')

    for nome, conteudo in arquivos.items():
        with open(os.path.join(AQUI, nome), 'w', encoding='utf-8') as f:
            f.write(conteudo)
    print('Gerados:', ', '.join(arquivos))


if __name__ == '__main__':
    gerar()
