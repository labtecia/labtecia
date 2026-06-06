$jsonPath = Join-Path $PSScriptRoot "site.json"
$jsPath = Join-Path $PSScriptRoot "site-data.js"

$json = Get-Content -Raw -LiteralPath $jsonPath
Set-Content -LiteralPath $jsPath -Value "window.LABTEC_DATA = $json;" -Encoding UTF8

Write-Host "Updated $jsPath"
