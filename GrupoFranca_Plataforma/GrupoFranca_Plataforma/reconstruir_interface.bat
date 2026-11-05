@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js 22.12 ou superior para editar e recompilar o React.
 exit /b 1
)
cd frontend
call npm ci
if errorlevel 1 exit /b 1
call npm run build
exit /b %errorlevel%
