# Cree le fichier .env a partir de .env.example avec des secrets generes au hasard.
$root = Split-Path -Parent $PSScriptRoot
$example = Join-Path $root '.env.example'
$target = Join-Path $root '.env'
if (Test-Path $target) { Write-Host '.env existe deja.'; exit 0 }
function New-Secret([int]$len) {
  $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  $bytes = New-Object byte[] $len
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}
$content = Get-Content $example -Raw -Encoding UTF8
$content = $content -replace 'DB_PASSWORD=.*', ('DB_PASSWORD=' + (New-Secret 24))
$content = $content -replace 'JWT_SECRET=.*', ('JWT_SECRET=' + (New-Secret 48))
$content = $content -replace 'ADMIN_PASSWORD=.*', ('ADMIN_PASSWORD=' + (New-Secret 14))
[System.IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding $false))
Write-Host 'Fichier .env cree.'
