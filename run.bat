@echo off
REM ===========================================================================
REM  SponsorSync - one-click setup and run (Windows)
REM
REM  Double-click this file. It checks Node, installs dependencies the first
REM  time, and opens the client and server in two terminal windows.
REM
REM  Deliberately does NOT run db:migrate or db:seed. The team shares one dev
REM  database that already has every migration and the seed admin; re-seeding
REM  would reset the shared admin password for everyone. See docs/local-setup.md
REM  if you are building a database from scratch.
REM ===========================================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo   SponsorSync
echo   ===========
echo.

REM --------------------------------------------------------------------------
REM  1. Node 24+
REM --------------------------------------------------------------------------
set "NEED_NODE="

where node >nul 2>&1
if errorlevel 1 (
    echo   [  ] Node.js is not installed.
    set "NEED_NODE=1"
) else (
    for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set "NODE_MAJOR=%%v"
    set "NODE_MAJOR=!NODE_MAJOR:v=!"
    if !NODE_MAJOR! LSS 24 (
        for /f %%v in ('node -v') do echo   [  ] Node %%v found, but this project needs Node 24 or newer.
        set "NEED_NODE=1"
    ) else (
        for /f %%v in ('node -v') do echo   [OK] Node %%v
    )
)

if defined NEED_NODE (
    where winget >nul 2>&1
    if errorlevel 1 (
        echo.
        echo   winget is not available on this machine, so Node cannot be installed
        echo   automatically. Download Node 24 LTS from https://nodejs.org, install
        echo   it, then run this file again.
        echo.
        pause
        exit /b 1
    )

    echo.
    echo   Node 24 can be installed now using winget, the package manager built
    echo   into Windows. It installs the official build from Microsoft's
    echo   repository - nothing is downloaded from anywhere else.
    echo.
    choice /c YN /n /m "   Install Node.js LTS now? [Y/N] "
    if errorlevel 2 (
        echo.
        echo   Skipped. Install Node 24 from https://nodejs.org, then run this file again.
        echo.
        pause
        exit /b 1
    )

    echo.
    echo   Installing Node.js LTS...
    winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if errorlevel 1 (
        echo.
        echo   The install did not complete. Install Node 24 manually from
        echo   https://nodejs.org and run this file again.
        echo.
        pause
        exit /b 1
    )

    echo.
    echo   ---------------------------------------------------------------
    echo    Node is installed, but this window still has the old PATH and
    echo    cannot see it yet. That is normal.
    echo.
    echo    CLOSE THIS WINDOW and double-click run.bat again.
    echo   ---------------------------------------------------------------
    echo.
    pause
    exit /b 0
)

REM --------------------------------------------------------------------------
REM  2. Dependencies
REM --------------------------------------------------------------------------
if exist "node_modules" (
    echo   [OK] Dependencies already installed
) else (
    echo   [  ] Installing dependencies - this takes a couple of minutes the first time...
    echo.
    call npm ci
    if errorlevel 1 (
        echo.
        echo   npm ci failed. The usual cause is the wrong Node version; this project
        echo   requires Node 24 or newer and refuses to install on anything older.
        echo   Scroll up for the actual error.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo   [OK] Dependencies installed
)

REM --------------------------------------------------------------------------
REM  3. Run
REM --------------------------------------------------------------------------
echo.
echo   Starting two windows: server and client.
echo.
echo     Server   http://localhost:4000
echo     App      http://localhost:5174    ^<- open this one
echo.
echo   Sign in with the seeded admin. Credentials are in server\.env.
echo   Close either window to stop that side. This window can be closed now.
echo.

REM No `cd` here on purpose. `start` inherits this script's working directory, which the
REM `cd /d "%~dp0"` at the top already set to the repo root. Passing it again would expand
REM to a path with a trailing backslash ("D:\graduation\") and the \" would break the quoting.
start "SponsorSync server" cmd /k "npm run dev:server"
start "SponsorSync client" cmd /k "npm run dev:client"

endlocal
