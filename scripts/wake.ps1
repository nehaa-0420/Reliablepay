param (
    [string]$PaymentServiceUrl = $env:PAYMENT_SERVICE_URL,
    [string]$MockBankUrl = $env:MOCK_BANK_URL,
    [int]$TimeoutSeconds = 180,
    [int]$IntervalSeconds = 3
)

if (-not $PaymentServiceUrl -or -not $MockBankUrl) {
    Write-Host "ERROR: Missing required service URLs." -ForegroundColor Red
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\wake.ps1 -PaymentServiceUrl <payment-url> -MockBankUrl <mock-bank-url>" -ForegroundColor Yellow
    Write-Host "  or set `$env:PAYMENT_SERVICE_URL and `$env:MOCK_BANK_URL environment variables." -ForegroundColor Yellow
    exit 1
}

$PaymentServiceUrl = $PaymentServiceUrl.TrimEnd('/')
$MockBankUrl = $MockBankUrl.TrimEnd('/')

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "ReliablePay -- Pre-Demo Cloud Wake-Up and Health Poller" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Payment Service: $PaymentServiceUrl" -ForegroundColor Gray
Write-Host "Mock Bank:       $MockBankUrl" -ForegroundColor Gray
Write-Host "Timeout:         ${TimeoutSeconds}s (polling every ${IntervalSeconds}s)" -ForegroundColor Gray
Write-Host "Started at:      $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray

function Check-HealthUrl {
    param ([string]$url)
    try {
        $response = Invoke-RestMethod -Uri "$url/actuator/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
        if ($response.status -eq "UP") {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

Write-Host "[Trigger] Dispatching initial wake-up signals..." -ForegroundColor Yellow
try {
    $null = Invoke-RestMethod -Uri "$PaymentServiceUrl/api/system/wake" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {
}
try {
    $null = Invoke-RestMethod -Uri "$MockBankUrl/actuator/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {
}

$startTime = [System.Diagnostics.Stopwatch]::StartNew()
$paymentUp = $false
$bankUp = $false
$attempt = 1

while ($startTime.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    $elapsed = [math]::Round($startTime.Elapsed.TotalSeconds, 1)

    if (-not $paymentUp) {
        $paymentUp = Check-HealthUrl -url $PaymentServiceUrl
    }

    if (-not $bankUp) {
        $bankUp = Check-HealthUrl -url $MockBankUrl
    }

    $payStatus = if ($paymentUp) { "UP" } else { "COLD_BOOT / AWAKENING" }
    $bankStatus = if ($bankUp) { "UP" } else { "COLD_BOOT / AWAKENING" }

    $payColor = if ($paymentUp) { "Green" } else { "Yellow" }
    $bankColor = if ($bankUp) { "Green" } else { "Yellow" }

    Write-Host "[${elapsed}s] Check #$attempt" -NoNewline -ForegroundColor Gray
    Write-Host " | Payment Service: " -NoNewline
    Write-Host "$payStatus" -NoNewline -ForegroundColor $payColor
    Write-Host " | Mock Bank: " -NoNewline
    Write-Host "$bankStatus" -ForegroundColor $bankColor

    if ($paymentUp -and $bankUp) {
        $startTime.Stop()
        Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "SUCCESS: Both services are fully AWAKE and healthy!" -ForegroundColor Green
        Write-Host "Total Wake-Up Duration: $([math]::Round($startTime.Elapsed.TotalSeconds, 2)) seconds." -ForegroundColor Green
        Write-Host "Completed at:           $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
        Write-Host "======================================================================" -ForegroundColor Cyan
        exit 0
    }

    Start-Sleep -Seconds $IntervalSeconds
    $attempt++
}

$startTime.Stop()
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "TIMEOUT: Services did not report UP within ${TimeoutSeconds}s." -ForegroundColor Red
Write-Host "Payment Service: $(if ($paymentUp) { 'UP' } else { 'FAILED/DOWN' })" -ForegroundColor Red
Write-Host "Mock Bank:       $(if ($bankUp) { 'UP' } else { 'FAILED/DOWN' })" -ForegroundColor Red
Write-Host "If running on localhost, verify Docker Compose: docker compose ps" -ForegroundColor Yellow
Write-Host "If running on Render, check Dashboard logs: https://dashboard.render.com" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
exit 1
