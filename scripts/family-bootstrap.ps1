<#
.SYNOPSIS
  One-shot bootstrap for the Family App (Part C) integration with AstroHEALTH.

.DESCRIPTION
  Automates everything needed after commit 6c4c25b:
    1. Ensures FAMILY APP2026\backend\.env exists (creates from .env.example, prompts for Supabase creds)
    2. Ensures AstroHEALTH .env has VITE_FAMILY_APP_URL=http://localhost:3001
    3. Runs npm install in Family backend + frontend if node_modules missing
    4. (Optional) Runs supabase-family-app-migration.sql via psql if -RunMigration is passed
    5. Starts Family backend in a new PowerShell window (port 5000)
    6. Starts Family frontend in a new PowerShell window (port 3001)

.PARAMETER FamilyRoot
  Path to the Family App. Defaults to C:\Users\user\Documents\FAMILY APP2026

.PARAMETER AstroRoot
  Path to AstroHEALTH. Defaults to the parent of this script.

.PARAMETER RunMigration
  If passed, also runs the Supabase migration via psql. Requires psql on PATH and a valid SUPABASE_DB_URL.

.PARAMETER SkipInstall
  Skip npm install steps even if node_modules is missing.

.EXAMPLE
  .\scripts\family-bootstrap.ps1
  .\scripts\family-bootstrap.ps1 -RunMigration
#>
[CmdletBinding()]
param(
    [string]$FamilyRoot = "",
    [string]$AstroRoot  = "",
    [switch]$RunMigration,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

if (-not $AstroRoot) {
    if ($PSScriptRoot) { $AstroRoot = Split-Path -Parent $PSScriptRoot }
    else { $AstroRoot = (Get-Location).Path }
}

# Prefer the embedded monorepo copy at <AstroRoot>\family-app, but fall back
# to the legacy standalone path if the embedded copy is absent.
if (-not $FamilyRoot) {
    $embedded = Join-Path $AstroRoot 'family-app'
    if (Test-Path (Join-Path $embedded 'backend')) {
        $FamilyRoot = $embedded
    } else {
        $FamilyRoot = "C:\Users\user\Documents\FAMILY APP2026"
    }
}

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [ok] $msg"  -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "  [!]  $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 0. Sanity checks
# ---------------------------------------------------------------------------
Write-Step "Checking paths"
if (-not (Test-Path $FamilyRoot))           { throw "Family App not found at $FamilyRoot" }
if (-not (Test-Path "$FamilyRoot\backend"))  { throw "Family backend not found"  }
if (-not (Test-Path "$FamilyRoot\frontend")) { throw "Family frontend not found" }
if (-not (Test-Path $AstroRoot))             { throw "AstroHEALTH root not found at $AstroRoot" }
Write-Ok "FamilyRoot = $FamilyRoot"
Write-Ok "AstroRoot  = $AstroRoot"

# ---------------------------------------------------------------------------
# 1. Family backend .env
# ---------------------------------------------------------------------------
Write-Step "Ensuring Family backend .env"
$envPath = Join-Path $FamilyRoot 'backend\.env'
$envExample = Join-Path $FamilyRoot 'backend\.env.example'

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExample)) { throw ".env.example missing at $envExample" }
    Copy-Item $envExample $envPath
    Write-Ok "Created $envPath from .env.example"

    Write-Host ""
    Write-Host "Optional: enter Supabase pooler details now (press Enter to keep defaults / fill later)" -ForegroundColor Yellow
    $useSupabase = Read-Host "Configure Supabase now? (y/N)"
    if ($useSupabase -match '^[Yy]') {
        $dbHost = Read-Host "DB_HOST (e.g. aws-0-eu-west-1.pooler.supabase.com)"
        $dbUser = Read-Host "DB_USER (e.g. postgres.<project-ref>)"
        $dbPwd  = Read-Host "DB_PASSWORD" -AsSecureString
        $dbPwdPlain = [System.Net.NetworkCredential]::new('', $dbPwd).Password
        $jwt    = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

        $content = Get-Content $envPath -Raw
        if ($dbHost) { $content = $content -replace 'DB_HOST=.*', "DB_HOST=$dbHost" }
        $content = $content -replace 'DB_PORT=.*', 'DB_PORT=6543'
        $content = $content -replace 'DB_NAME=.*', 'DB_NAME=postgres'
        if ($dbUser)   { $content = $content -replace 'DB_USER=.*', "DB_USER=$dbUser" }
        if ($dbPwdPlain) { $content = $content -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$dbPwdPlain" }
        $content = $content -replace 'DB_SSL=.*', 'DB_SSL=true'
        $content = $content -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwt"
        Set-Content -Path $envPath -Value $content -NoNewline
        Write-Ok "Supabase credentials saved to $envPath (DB_SCHEMA=family)"
    } else {
        Write-Warn2 "Skipped Supabase config — edit $envPath manually before starting backend."
    }
} else {
    Write-Ok ".env already exists — leaving untouched"
}

# ---------------------------------------------------------------------------
# 2. AstroHEALTH .env — ensure VITE_FAMILY_APP_URL
# ---------------------------------------------------------------------------
Write-Step "Ensuring AstroHEALTH VITE_FAMILY_APP_URL"
$astroEnv = Join-Path $AstroRoot '.env'
$line = 'VITE_FAMILY_APP_URL=http://localhost:3001'
if (-not (Test-Path $astroEnv)) {
    Set-Content -Path $astroEnv -Value "$line`n"
    Write-Ok "Created $astroEnv"
} else {
    $existing = Get-Content $astroEnv -Raw
    if ($existing -notmatch 'VITE_FAMILY_APP_URL=') {
        Add-Content -Path $astroEnv -Value $line
        Write-Ok "Appended VITE_FAMILY_APP_URL to .env"
    } else {
        Write-Ok "VITE_FAMILY_APP_URL already set"
    }
}

# ---------------------------------------------------------------------------
# 2b. Family frontend .env — Supabase Realtime keys for cross-device sync
# ---------------------------------------------------------------------------
Write-Step "Ensuring Family frontend .env (Supabase Realtime)"
$feEnv = Join-Path $FamilyRoot 'frontend\.env'
$feEnvExample = Join-Path $FamilyRoot 'frontend\.env.example'
if (-not (Test-Path $feEnv)) {
    if (Test-Path $feEnvExample) { Copy-Item $feEnvExample $feEnv } else { Set-Content $feEnv '' }
    Write-Ok "Created $feEnv"
}
$feContent = Get-Content $feEnv -Raw
if ($feContent -notmatch 'REACT_APP_SUPABASE_URL=') {
    Add-Content $feEnv "`nREACT_APP_SUPABASE_URL="
    $feContent = Get-Content $feEnv -Raw
}
if ($feContent -notmatch 'REACT_APP_SUPABASE_ANON_KEY=') {
    Add-Content $feEnv "`nREACT_APP_SUPABASE_ANON_KEY="
    $feContent = Get-Content $feEnv -Raw
}
if ($feContent -match 'REACT_APP_SUPABASE_URL=\s*\r?\n' -or $feContent -match 'REACT_APP_SUPABASE_URL=\s*$') {
    $askSb = Read-Host "Enter Supabase project URL for Family realtime (blank to skip)"
    if ($askSb) {
        $askKey = Read-Host "Enter Supabase anon key"
        $feContent = $feContent -replace 'REACT_APP_SUPABASE_URL=.*', "REACT_APP_SUPABASE_URL=$askSb"
        if ($askKey) { $feContent = $feContent -replace 'REACT_APP_SUPABASE_ANON_KEY=.*', "REACT_APP_SUPABASE_ANON_KEY=$askKey" }
        Set-Content -Path $feEnv -Value $feContent -NoNewline
        Write-Ok "Supabase Realtime keys saved to $feEnv"
    } else {
        Write-Warn2 "Realtime keys not set — cross-device push disabled until you fill $feEnv"
    }
} else {
    Write-Ok "Frontend Supabase keys already present"
}

# ---------------------------------------------------------------------------
# 3. npm install (backend + frontend) if needed
# ---------------------------------------------------------------------------
if (-not $SkipInstall) {
    Write-Step "Installing Family backend dependencies (if needed)"
    if (-not (Test-Path "$FamilyRoot\backend\node_modules")) {
        Push-Location "$FamilyRoot\backend"
        try { npm install --no-audit --no-fund } finally { Pop-Location }
        Write-Ok "Backend deps installed"
    } else { Write-Ok "Backend node_modules already present" }

    Write-Step "Installing Family frontend dependencies (if needed)"
    Push-Location "$FamilyRoot\frontend"
    try {
        if (-not (Test-Path "node_modules")) {
            npm install --no-audit --no-fund
            Write-Ok "Frontend deps installed"
        } else { Write-Ok "Frontend node_modules already present" }
        if (-not (Test-Path "node_modules\@supabase\supabase-js")) {
            Write-Step "Adding @supabase/supabase-js for realtime cross-device sync"
            npm install --no-audit --no-fund @supabase/supabase-js@^2.45.4
            Write-Ok "@supabase/supabase-js installed"
        }
    } finally { Pop-Location }
} else {
    Write-Warn2 "Skipping npm install (-SkipInstall)"
}

# ---------------------------------------------------------------------------
# 4. Optional: run Supabase migration via psql
# ---------------------------------------------------------------------------
if ($RunMigration) {
    Write-Step "Running Supabase migrations via psql"
    $migFiles = @(
        (Join-Path $AstroRoot 'supabase-family-app-migration.sql'),
        (Join-Path $AstroRoot 'supabase-family-realtime.sql')
    )
    foreach ($mf in $migFiles) {
        if (-not (Test-Path $mf)) { Write-Warn2 "Missing $mf"; continue }
    }

    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psql) {
        Write-Warn2 "psql not on PATH — paste each .sql into Supabase SQL Editor manually:"
        foreach ($mf in $migFiles) { Write-Warn2 "  $mf" }
    } else {
        $dbUrl = $env:SUPABASE_DB_URL
        if (-not $dbUrl) {
            Write-Host "Provide a Supabase connection string in this format:" -ForegroundColor Yellow
            Write-Host "  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres" -ForegroundColor DarkGray
            $dbUrl = Read-Host "SUPABASE_DB_URL"
        }
        if ($dbUrl) {
            foreach ($mf in $migFiles) {
                if (-not (Test-Path $mf)) { continue }
                Write-Step "psql -f $(Split-Path -Leaf $mf)"
                & psql $dbUrl -v ON_ERROR_STOP=1 -f $mf
                if ($LASTEXITCODE -eq 0) { Write-Ok "Applied $(Split-Path -Leaf $mf)" }
                else { Write-Warn2 "psql exited with code $LASTEXITCODE for $mf" }
            }
        } else {
            Write-Warn2 "No SUPABASE_DB_URL provided — skipping migrations."
        }
    }
} else {
    Write-Warn2 "Skipping migrations (-RunMigration not passed). Paste these into Supabase SQL Editor:"
    Write-Warn2 "  supabase-family-app-migration.sql   (schema)"
    Write-Warn2 "  supabase-family-realtime.sql        (realtime publication)"
}

# ---------------------------------------------------------------------------
# 5. Launch Family backend + frontend in separate windows
# ---------------------------------------------------------------------------
Write-Step "Launching Family backend (port 5000) in a new window"
Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$FamilyRoot\backend'; `$Host.UI.RawUI.WindowTitle='Family Backend :5000'; npm run dev"
) | Out-Null
Write-Ok "Backend window launched"

Start-Sleep -Seconds 2

Write-Step "Launching Family frontend (port 3001) in a new window"
Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$FamilyRoot\frontend'; `$Host.UI.RawUI.WindowTitle='Family Frontend :3001'; `$env:PORT=3001; `$env:BROWSER='none'; npm start"
) | Out-Null
Write-Ok "Frontend window launched"

Write-Host ""
Write-Host "All done." -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:5000" -ForegroundColor Gray
Write-Host "  Frontend -> http://localhost:3001" -ForegroundColor Gray
Write-Host "  AstroHEALTH route -> /family (after npm run dev)" -ForegroundColor Gray
Write-Host ""
Write-Host "Tip: re-run with -RunMigration to push the SQL schema via psql." -ForegroundColor DarkGray
