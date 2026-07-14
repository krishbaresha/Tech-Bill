$tunnelPid = $null
$netstatLines = netstat -ano | Select-String "127.0.0.1:5432"
foreach ($line in $netstatLines) {
    if ($line -match "LISTENING") {
        $parts = ($line.ToString().Trim() -split '\s+')
        $tunnelPid = [int]$parts[-1]
        break
    }
}

if ($tunnelPid) {
    Write-Host "SSH tunnel found on PID $tunnelPid - preserving it."
} else {
    Write-Host "No SSH tunnel on :5432."
}

Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Id -ne $tunnelPid) {
        Write-Host "Killing node PID $($_.Id)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2
Write-Host "Starting API..."
Set-Location "C:\Tech-Bill\Tech-Bill\techbill-api"
npm run start:dev
