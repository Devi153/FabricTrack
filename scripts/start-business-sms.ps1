$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
foreach ($key in @("BUSINESS_DB_PASSWORD", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER")) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
        throw "Set $key in this terminal before starting SMS mode. See README.md."
    }
}
$env:BUSINESS_ENABLED = "true"
$env:BUSINESS_SMS_MODE = "twilio"
$env:SPRING_DEVTOOLS_RESTART_ENABLED = "false"
$secretPath = Join-Path $root ".business-otp-pepper"
if (!$env:BUSINESS_OTP_PEPPER) {
    if (!(Test-Path $secretPath)) { throw "Set BUSINESS_OTP_PEPPER or run local setup first to generate the pepper." }
    $env:BUSINESS_OTP_PEPPER = [IO.File]::ReadAllText($secretPath).Trim()
}
Push-Location (Join-Path $root "backend")
try {
    & .\mvnw.cmd spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw "Backend startup failed. Check the error above." }
} finally { Pop-Location }
