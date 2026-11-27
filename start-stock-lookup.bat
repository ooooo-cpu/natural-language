@echo off
setlocal
title Stock Lookup
pushd "%~dp0" || goto folder_error
set "STOCK_LOOKUP_LAUNCHER=%~f0"
set "STOCK_LOOKUP_NO_BROWSER="
if /i "%~1"=="--no-browser" set "STOCK_LOOKUP_NO_BROWSER=1"
powershell.exe -NoLogo -NoProfile -Command "$source = Get-Content -LiteralPath $env:STOCK_LOOKUP_LAUNCHER -Raw; & ([scriptblock]::Create(($source -split '(?m)^:powershell\r?\n', 2)[1]))"
set "launch_status=%errorlevel%"
popd
if not "%launch_status%"=="0" pause
exit /b %launch_status%

:folder_error
echo Could not open the Stock Lookup folder.
pause
exit /b 1

:powershell
$ErrorActionPreference = 'Stop'
$server = $null
$launchStatus = 1

try {
    $node = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) {
        throw 'Install Node.js 20 or newer, then launch this script again.'
    }

    $version = & $node.Source --version
    if ($version -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 20) {
        throw "Node.js 20 or newer is required. Found: $version"
    }

    if (-not (Test-Path -LiteralPath 'server/local.mjs' -PathType Leaf)) {
        throw 'Keep this launcher in the Stock Lookup folder, next to package.json.'
    }

    $env:HOST = '127.0.0.1'
    $startInfo = [Diagnostics.ProcessStartInfo]::new($node.Source, 'server/local.mjs')
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $server = [Diagnostics.Process]::Start($startInfo)
    Write-Host 'Press Ctrl+C or close this window to stop Stock Lookup.'

    while ($null -ne ($line = $server.StandardOutput.ReadLine())) {
        if ($line -match '^Stock Lookup is running at http://localhost:(\d+)$') {
            $url = "http://127.0.0.1:$($Matches[1])"
            Write-Host "Stock Lookup is running at $url"
            if (-not $env:STOCK_LOOKUP_NO_BROWSER) {
                try {
                    Start-Process $url
                } catch {
                    Write-Host "Open $url in your browser." -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host $line
        }
    }

    $server.WaitForExit()
    $launchStatus = $server.ExitCode
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    if ($server) {
        if (-not $server.HasExited) {
            Stop-Process -InputObject $server -ErrorAction SilentlyContinue
        }
        $server.Dispose()
    }
}

exit $launchStatus
