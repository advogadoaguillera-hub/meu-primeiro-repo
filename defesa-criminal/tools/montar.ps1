# ============================================================================
#  MONTAGEM DE PÁGINAS — Jocsan Aguillera | Defesa Criminal
# ----------------------------------------------------------------------------
#  Substitui, DENTRO DOS PRÓPRIOS ARQUIVOS .html do site, os marcadores:
#
#     <!--#CABECALHO-->   ->  conteúdo de _partes/cabecalho.html
#     <!--#RODAPE-->      ->  conteúdo de _partes/rodape.html
#     {{B}}               ->  ""  na raiz  |  "../"  dentro de subpastas
#
#  O resultado é HTML estático completo: a hospedagem NÃO precisa deste
#  script. Ele existe apenas para manter cabeçalho e rodapé sincronizados.
#
#  Como usar (na pasta defesa-criminal):
#     powershell -ExecutionPolicy Bypass -File tools\montar.ps1
#
#  Para alterar o menu ou o rodapé de TODO o site:
#     1. edite _partes/cabecalho.html ou _partes/rodape.html
#     2. reinsira os marcadores nas páginas que quiser regenerar
#     3. rode este script novamente
# ============================================================================

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
$cab  = Get-Content (Join-Path $raiz "_partes\cabecalho.html") -Raw -Encoding UTF8
$rod  = Get-Content (Join-Path $raiz "_partes\rodape.html")    -Raw -Encoding UTF8

$paginas = Get-ChildItem -Path $raiz -Filter *.html -Recurse |
           Where-Object { $_.FullName -notmatch '\\_partes\\' }

$alterados = 0

foreach ($p in $paginas) {
  $html = Get-Content $p.FullName -Raw -Encoding UTF8

  if ($html -notmatch '<!--#CABECALHO-->' -and
      $html -notmatch '<!--#RODAPE-->'    -and
      $html -notmatch '\{\{B\}\}') { continue }

  # Profundidade relativa à raiz do site -> prefixo de caminho
  $relDir = $p.DirectoryName.Substring($raiz.Length).Trim('\')
  $niveis = if ($relDir -eq '') { 0 } else { ($relDir -split '\\').Count }
  $base   = '../' * $niveis

  $html = $html.Replace('<!--#CABECALHO-->', $cab)
  $html = $html.Replace('<!--#RODAPE-->',    $rod)
  $html = $html.Replace('{{B}}',             $base)

  # UTF-8 sem BOM
  [System.IO.File]::WriteAllText($p.FullName, $html, (New-Object System.Text.UTF8Encoding($false)))

  Write-Host ("  montado: " + $p.FullName.Substring($raiz.Length + 1))
  $alterados++
}

Write-Host ""
Write-Host ("Concluido. Paginas montadas: " + $alterados)
