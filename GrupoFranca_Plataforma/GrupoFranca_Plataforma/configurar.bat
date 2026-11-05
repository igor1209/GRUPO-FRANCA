@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
 echo Instale o Python 3.13 com o Python Launcher e tente novamente.
 pause
 exit /b 1
)
py -3.13 -m venv .venv
if errorlevel 1 goto erro
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto erro
if exist frontend\dist\index.html (
 echo Interface pronta incluida. Para alterar o React, use reconstruir_interface.bat.
) else (
 call reconstruir_interface.bat
 if errorlevel 1 goto erro
)
echo.
echo Configuracao concluida. Abra iniciar.bat.
pause
exit /b 0
:erro
echo A configuracao falhou. Confira a mensagem acima.
pause
exit /b 1
