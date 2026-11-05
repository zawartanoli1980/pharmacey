@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24.22 or newer, then run this file again.
  pause
  exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);if(major<24||(major===24&&minor<22))process.exit(1)"
if errorlevel 1 (
  echo Node.js 24.22 or newer is required. Upgrade Node and try again.
  pause
  exit /b 1
)
if not exist package-lock.json (
  echo Project files are incomplete. Extract the full ZIP before starting.
  pause
  exit /b 1
)
node scripts/check-dependencies.mjs
if errorlevel 1 (
  echo Installing the locked project dependencies. Please wait.
  call npm.cmd ci --include=dev
  if errorlevel 1 (
    echo Dependency installation failed. Review the error above.
    pause
    exit /b 1
  )
  node scripts/check-dependencies.mjs
  if errorlevel 1 (
    echo Dependencies are still incomplete. Review the error above.
    pause
    exit /b 1
  )
)
echo Starting SmartMed. Keep this server window open.
call npm.cmd run dev
if errorlevel 1 pause
