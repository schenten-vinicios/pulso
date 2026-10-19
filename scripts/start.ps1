$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $pulsoNode = Get-ChildItem -LiteralPath '.tools' -Directory -Filter 'node-*-win-x64' | Select-Object -First 1
    if (-not $pulsoNode) { throw 'Instale Node.js 22.12 ou superior e tente novamente.' }
    $env:PATH = "$($pulsoNode.FullName);$env:PATH"
}
if (-not (Test-Path -LiteralPath 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências.' }
}
& npm.cmd run dev
