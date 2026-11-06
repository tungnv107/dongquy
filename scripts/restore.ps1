param([Parameter(Mandatory=$true)][string]$BackupFile,[string]$TargetDatabase = 'dongquy_restore',[string]$ComposeFile = 'compose.yml',[string]$DatabaseUser = 'dongquy')
$ErrorActionPreference = 'Stop'
if ($TargetDatabase -notmatch '^[a-zA-Z0-9_]+_(restore|test)$') { throw 'Target database must end with _restore or _test.' }
$source = (Resolve-Path -LiteralPath $BackupFile).Path
$container = docker compose -f $ComposeFile ps -q db
if (-not $container) { throw 'PostgreSQL container is not running.' }
$exists = docker exec $container psql -U $DatabaseUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$TargetDatabase'"
if ($exists -match '1') { throw 'Target already exists. Use a new, empty restore database. Existing databases are never overwritten.' }
docker exec $container createdb -U $DatabaseUser $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw 'Creating restore database failed.' }
$remoteFile = '/tmp/dongquy-restore-' + (Get-Date -Format 'yyyyMMddHHmmss') + '.dump'
docker cp $source ($container + ':' + $remoteFile)
if ($LASTEXITCODE -ne 0) { throw 'Copying backup failed.' }
docker exec $container pg_restore -U $DatabaseUser -d $TargetDatabase --no-owner --exit-on-error $remoteFile
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; inspect the isolated target database.' }
Write-Output ('Restored into isolated database: ' + $TargetDatabase)
