$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$env:BUSINESS_ENABLED = "true"
$env:BUSINESS_SMS_MODE = "console"
$env:SPRING_PROFILES_ACTIVE = "business-local"
$env:SPRING_DEVTOOLS_RESTART_ENABLED = "false"
$env:SERVER_ADDRESS = "127.0.0.1"
if (!$env:BUSINESS_DB_URL) { $env:BUSINESS_DB_URL = "jdbc:postgresql://127.0.0.1:54322/postgres" }
if (!$env:BUSINESS_DB_USER) { $env:BUSINESS_DB_USER = "postgres" }
if (!$env:BUSINESS_DB_PASSWORD) { $env:BUSINESS_DB_PASSWORD = "postgres" }
$secretPath = Join-Path $root ".business-otp-pepper"
if (!(Test-Path $secretPath)) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    [IO.File]::WriteAllText($secretPath, [Convert]::ToBase64String($bytes))
}
$env:BUSINESS_OTP_PEPPER = [IO.File]::ReadAllText($secretPath).Trim()
Write-Host "LOCAL TEST MODE: OTP codes will appear in this terminal. No real SMS is sent."
Push-Location (Join-Path $root "backend")
try {
    & .\mvnw.cmd spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw "Backend startup failed. Read the first Caused by message above." }
} finally { Pop-Location }
