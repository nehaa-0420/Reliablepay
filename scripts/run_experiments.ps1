param(
    [int]$Count = 100,
    [int]$Concurrency = 10,
    [double]$DuplicateSubmitRate = 0.2,
    [double]$TimeoutRate = 0.3,
    [double]$ErrorRate = 0.1,
    [double]$ChannelFailureRate = 0.05,
    [double]$ChargeOnTimeoutProbability = 0.5,
    [int]$LatencyMs = 100,
    [int]$Repetitions = 3,
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Label = "Baseline-100"
)

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "ReliablePay Empirical Experiment Suite: $Label" -ForegroundColor Cyan
Write-Host "Count: $Count | Concurrency: $Concurrency | DupRate: $DuplicateSubmitRate" -ForegroundColor Cyan
Write-Host "Chaos: TimeoutRate=$TimeoutRate, ErrorRate=$ErrorRate, ChannelRate=$ChannelFailureRate" -ForegroundColor Cyan
Write-Host "Repetitions: $Repetitions" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

$runs = @()

for ($r = 1; $r -le $Repetitions; $r++) {
    Write-Host "`n--- Starting Repetition $r of $Repetitions ---" -ForegroundColor Yellow

    # Reset state prior to each run
    try {
        $resetResp = Invoke-RestMethod -Uri "$BaseUrl/api/admin/reset" -Method Post
        Write-Host "Database and bank reset: $($resetResp.status)" -ForegroundColor Gray
    } catch {
        Write-Warning "Reset endpoint notice: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 2

    # Launch experiment
    $body = @{
        count = $Count
        concurrency = $Concurrency
        duplicateSubmitRate = $DuplicateSubmitRate
        chaos = @{
            timeoutRate = $TimeoutRate
            errorRate = $ErrorRate
            channelFailureRate = $ChannelFailureRate
            chargeOnTimeoutProbability = $ChargeOnTimeoutProbability
            latencyMs = $LatencyMs
        }
    } | ConvertTo-Json -Depth 5

    $launchResp = Invoke-RestMethod -Uri "$BaseUrl/api/experiments/run" -Method Post -Body $body -ContentType "application/json"
    $expId = $launchResp.experimentId
    Write-Host "Experiment launched with ID: $expId" -ForegroundColor Green

    # Poll until DONE
    $status = "RUNNING"
    $pollCount = 0
    $expData = $null

    while ($status -eq "RUNNING" -and $pollCount -lt 120) {
        Start-Sleep -Seconds 3
        $pollCount++
        $expData = Invoke-RestMethod -Uri "$BaseUrl/api/experiments/$expId" -Method Get
        $status = $expData.status
        Write-Host "Polling [$pollCount] Status: $status ... (elapsed ~$($pollCount * 3)s)" -ForegroundColor Gray
    }

    if ($status -ne "DONE") {
        Write-Error "Experiment $expId did not complete successfully. Status: $status. Error: $($expData.errorMessage)"
        exit 1
    }

    Write-Host "Experiment $expId completed in $($expData.durationMs) ms." -ForegroundColor Green

    # Inspect Protected invariants (Safety Rule: duplicateOrdersCount MUST be 0)
    $protDups = $expData.protectedMode.duplicateOrdersCount
    if ($protDups -gt 0) {
        Write-Host "CRITICAL SAFETY VIOLATION: PROTECTED MODE PRODUCED $protDups DUPLICATES!" -ForegroundColor Red
        $incidentLines = @(
            "# INCIDENT REPORT: PROTECTED DUPLICATE ORDERS DETECTED",
            "",
            "Timestamp: " + (Get-Date -Format "o"),
            "Experiment ID: " + $expId,
            "Label: " + $Label,
            "Repetition: " + $r,
            "",
            "## Run Configuration",
            "- Count: $Count",
            "- Concurrency: $Concurrency",
            "- DuplicateSubmitRate: $DuplicateSubmitRate",
            "- Chaos: TimeoutRate=$TimeoutRate, ErrorRate=$ErrorRate, ChannelFailureRate=$ChannelFailureRate",
            "",
            "## Evidence Telemetry",
            "```json",
            ($expData | ConvertTo-Json -Depth 6),
            "```"
        )
        $incidentLines | Out-File -FilePath "docs/INCIDENT_PROTECTED_DUPLICATE.md" -Encoding utf8
        exit 2
    }

    $runs += [PSCustomObject]@{
        Repetition = $r
        ExperimentId = $expId
        DurationMs = $expData.durationMs
        NaiveOrdersSucceeded = $expData.naive.ordersSucceeded
        NaiveDups = $expData.naive.duplicateOrdersCount
        NaiveOvercharged = [double]$expData.naive.overchargedAmount
        NaiveRetrySuccessRate = [double]$expData.naive.retrySuccessRate
        NaiveAvgRecoveryMs = [double]$expData.naive.avgRecoveryMs
        NaiveAvgLatencyMs = [double]$expData.naive.avgLatencyMs
        NaiveP95LatencyMs = [double]$expData.naive.p95LatencyMs

        ProtOrdersSucceeded = $expData.protectedMode.ordersSucceeded
        ProtDups = $expData.protectedMode.duplicateOrdersCount
        ProtOvercharged = [double]$expData.protectedMode.overchargedAmount
        ProtRetrySuccessRate = [double]$expData.protectedMode.retrySuccessRate
        ProtAvgRecoveryMs = [double]$expData.protectedMode.avgRecoveryMs
        ProtAvgLatencyMs = [double]$expData.protectedMode.avgLatencyMs
        ProtP95LatencyMs = [double]$expData.protectedMode.p95LatencyMs
    }
}

function Get-Stats ($array) {
    if ($array.Count -eq 0) { return @{ Mean=0; Min=0; Max=0 } }
    $stats = $array | Measure-Object -Average -Minimum -Maximum
    return @{
        Mean = [Math]::Round($stats.Average, 2)
        Min = [Math]::Round($stats.Minimum, 2)
        Max = [Math]::Round($stats.Maximum, 2)
    }
}

$naiveDupsStats = Get-Stats ($runs | ForEach-Object { $_.NaiveDups })
$naiveOverchargeStats = Get-Stats ($runs | ForEach-Object { $_.NaiveOvercharged })
$naiveRetryStats = Get-Stats ($runs | ForEach-Object { $_.NaiveRetrySuccessRate * 100 })
$naiveRecoveryStats = Get-Stats ($runs | ForEach-Object { $_.NaiveAvgRecoveryMs })
$naiveP95Stats = Get-Stats ($runs | ForEach-Object { $_.NaiveP95LatencyMs })

$protDupsStats = Get-Stats ($runs | ForEach-Object { $_.ProtDups })
$protOverchargeStats = Get-Stats ($runs | ForEach-Object { $_.ProtOvercharged })
$protRetryStats = Get-Stats ($runs | ForEach-Object { $_.ProtRetrySuccessRate * 100 })
$protRecoveryStats = Get-Stats ($runs | ForEach-Object { $_.ProtAvgRecoveryMs })
$protP95Stats = Get-Stats ($runs | ForEach-Object { $_.ProtP95LatencyMs })

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "EXPERIMENT RESULTS SUMMARY ($Repetitions repetitions): $Label" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

$summaryTableLines = @(
    "| Metric | NAIVE (Mean [Min-Max]) | PROTECTED (Mean [Min-Max]) |",
    "|:-------|:-----------------------|:---------------------------|",
    "| **Duplicate Orders Charged** | " + $naiveDupsStats.Mean + " [" + $naiveDupsStats.Min + " - " + $naiveDupsStats.Max + "] | " + $protDupsStats.Mean + " [" + $protDupsStats.Min + " - " + $protDupsStats.Max + "] |",
    "| **Overcharged Amount (₹)** | ₹" + $naiveOverchargeStats.Mean + " [₹" + $naiveOverchargeStats.Min + " - ₹" + $naiveOverchargeStats.Max + "] | ₹" + $protOverchargeStats.Mean + " [₹" + $protOverchargeStats.Min + " - ₹" + $protOverchargeStats.Max + "] |",
    "| **Retry Success Rate (%)** | " + $naiveRetryStats.Mean + "% [" + $naiveRetryStats.Min + "% - " + $naiveRetryStats.Max + "%] | " + $protRetryStats.Mean + "% [" + $protRetryStats.Min + "% - " + $protRetryStats.Max + "%] |",
    "| **Avg Recovery Time (ms)** | " + $naiveRecoveryStats.Mean + " ms [" + $naiveRecoveryStats.Min + " - " + $naiveRecoveryStats.Max + "] | " + $protRecoveryStats.Mean + " ms [" + $protRecoveryStats.Min + " - " + $protRecoveryStats.Max + "] |",
    "| **P95 Latency (ms)** | " + $naiveP95Stats.Mean + " ms [" + $naiveP95Stats.Min + " - " + $naiveP95Stats.Max + "] | " + $protP95Stats.Mean + " ms [" + $protP95Stats.Min + " - " + $protP95Stats.Max + "] |"
)
$summaryTable = $summaryTableLines -join "`n"

Write-Host $summaryTable -ForegroundColor White

# Return the raw runs and summary as JSON
$resultObj = @{
    Label = $Label
    Config = @{
        Count = $Count
        Concurrency = $Concurrency
        DuplicateSubmitRate = $DuplicateSubmitRate
        TimeoutRate = $TimeoutRate
        ErrorRate = $ErrorRate
        Repetitions = $Repetitions
    }
    SummaryTable = $summaryTable
    Runs = $runs
}

$resultObj | ConvertTo-Json -Depth 6 | Out-File -FilePath "scripts/$Label-results.json" -Encoding utf8
Write-Host "`nSaved detailed results to scripts/$Label-results.json" -ForegroundColor Gray
