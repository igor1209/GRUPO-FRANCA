@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale o Node.js 22.12 ou superior. Depois abra um novo terminal.
 pause
 exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)?0:1)"
if errorlevel 1 (
 echo Atualize o Node.js para 22.12 ou superior.
 pause
 exit /b 1
)
cd whatsapp_bridge
echo Instalando o conector e o navegador Chromium. Aguarde o download.
call npm ci
if errorlevel 1 (
 echo Instalacao falhou. Confira sua internet e a mensagem acima.
 pause
 exit /b 1
)
echo Conector instalado. Reinicie iniciar.bat e abra WhatsApp na plataforma.
pause
