# ============================================================================
#  SERVIDOR LOCAL — apenas para pré-visualização durante a edição.
# ----------------------------------------------------------------------------
#  O site é estático: a hospedagem NÃO precisa deste arquivo. Ele existe só
#  para abrir o site em http://localhost, onde caminhos, manifest e favicon
#  funcionam como no servidor real (o que não acontece abrindo via file://).
#
#  Como usar (a partir da pasta defesa-criminal):
#     powershell -ExecutionPolicy Bypass -File tools\servidor-local.ps1
#
#  Depois acesse:  http://localhost:8099/
#  Para encerrar:  Ctrl + C
# ============================================================================

param(
  [int]$Port = 8099
)

$Root = Split-Path -Parent $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host ""
Write-Host "  Servindo: $Root"
Write-Host "  Endereco: http://localhost:$Port/"
Write-Host "  Ctrl + C para encerrar."
Write-Host ""

$types = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".js"="application/javascript; charset=utf-8"; ".json"="application/json; charset=utf-8";
  ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg";
  ".webp"="image/webp"; ".avif"="image/avif"; ".webmanifest"="application/manifest+json";
  ".xml"="application/xml"; ".txt"="text/plain; charset=utf-8"; ".ico"="image/x-icon"
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = Join-Path $Root $rel
    if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }

    if (Test-Path $path -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ct = $types[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ctx.Response.ContentType = $ct
      $ctx.Response.StatusCode = 200
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - $rel")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch { }
}
