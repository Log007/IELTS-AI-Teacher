$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$keyPath = Join-Path $PSScriptRoot '.deepseek-key'
try {
    if (-not (Test-Path -LiteralPath $keyPath)) {
        Write-Host 'First use: paste your DeepSeek API key and press Enter. Input is hidden.'
        $secureKey = Read-Host 'DeepSeek API Key' -AsSecureString
        if ($secureKey.Length -eq 0) { throw 'No key entered.' }
        $secureKey | ConvertFrom-SecureString | Set-Content -LiteralPath $keyPath -Encoding ASCII
    }
    $secureKey = Get-Content -LiteralPath $keyPath -Raw | ConvertTo-SecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    try { $env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $existing = Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue
    if (-not $existing) {
        Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        $ready = $false
        for ($i=0; $i -lt 30; $i++) {
            Start-Sleep -Milliseconds 200
            try { $response = Invoke-WebRequest 'http://127.0.0.1:3210/' -UseBasicParsing -TimeoutSec 1; if ($response.StatusCode -eq 200) { $ready = $true; break } } catch {}
        }
        if (-not $ready) { throw 'Could not start the local service. Check that Node.js is installed.' }
    } else {
        $owners = @($existing | Select-Object -ExpandProperty OwningProcess -Unique)
        $allowed = $owners.Count -eq 1 -and (Get-CimInstance Win32_Process -Filter "ProcessId=$($owners[0])").CommandLine -match 'node(?:\.exe)?["\s]+server\.js'
        if (-not $allowed) { throw 'Port 3210 is already in use. Close the other program and try again.' }
    }
    Start-Process 'http://127.0.0.1:3210'
} catch {
    Write-Host "Could not open IELTS Tutor: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
} finally { Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue }

