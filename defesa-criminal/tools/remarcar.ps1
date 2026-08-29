# ============================================================================
#  REMARCAR — reinsere os marcadores <!--#CABECALHO--> e <!--#RODAPE-->
# ----------------------------------------------------------------------------
#  Use quando o menu ou o rodape mudarem e for preciso regenerar TODAS as
#  paginas a partir de _partes/. O fluxo e:
#
#     1. editar _partes/cabecalho.html e/ou _partes/rodape.html
#     2. powershell -ExecutionPolicy Bypass -File tools\remarcar.ps1
#     3. powershell -ExecutionPolicy Bypass -File tools\montar.ps1
#
#  Este script apenas troca o bloco ja expandido pelo marcador. O montar.ps1
#  faz a expansao com o conteudo novo e os caminhos relativos corretos.
# ============================================================================

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot

$paginas = Get-ChildItem -Path $raiz -Filter *.html -Recurse |
           Where-Object { $_.FullName -notmatch '\\_partes\\' }

$n = 0
foreach ($p in $paginas) {
  $html = Get-Content $p.FullName -Raw -Encoding UTF8
  $orig = $html

  # Cabecalho: do link "pular" ate o fechamento do <header>
  $html = [regex]::Replace($html, '(?s)<a class="pular".*?</header>', '<!--#CABECALHO-->')

  # Rodape: do <footer class="rodape"> ate o </a> do botao flutuante do WhatsApp
  $html = [regex]::Replace($html, '(?s)<footer class="rodape">.*?</a>\s*(?=<script)', "<!--#RODAPE-->`r`n")

  if ($html -ne $orig) {
    [System.IO.File]::WriteAllText($p.FullName, $html, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("  remarcado: " + $p.FullName.Substring($raiz.Length + 1))
    $n++
  }
}

Write-Host ""
Write-Host ("Concluido. Paginas remarcadas: " + $n)
Write-Host "Agora rode: powershell -ExecutionPolicy Bypass -File tools\montar.ps1"
