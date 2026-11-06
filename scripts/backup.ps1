param([string]$OutputDirectory = 'backups',[string]$ComposeFile = 'compose.yml',[string]$Database = 'dongquy',[string]$DatabaseUser = 'dongquy')
$ErrorActionPreference = 'Stop'
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$container = docker compose -f $ComposeFile ps -q db
if (-not $container) { throw 'PostgreSQL container is not running.' }
$remoteFile = '/tmp/dongquy-backup-' + $stamp + '.dump'
docker exec $container pg_dump -U $DatabaseUser -d $Database -Fc -f $remoteFile
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
$destination = Join-Path $backupRoot ($Database + '-' + $stamp + '.dump')
docker cp ($container + ':' + $remoteFile) $destination
if ($LASTEXITCODE -ne 0) { throw 'Copying backup failed.' }
Get-FileHash -Algorithm SHA256 -LiteralPath $destination | Format-List
Write-Output ('Database backup: ' + $destination)
Write-Output 'Back up the uploads volume separately and encrypt/offsite both artifacts.'
