@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if "%SPRITE_VIDEO_LAB_APP_ROOT%"=="" (
  set "APP_ROOT=%SCRIPT_DIR%"
  if not exist "%SCRIPT_DIR%server.py" set "APP_ROOT=%SCRIPT_DIR%.."
) else (
  set "APP_ROOT=%SPRITE_VIDEO_LAB_APP_ROOT%"
)
for %%i in ("%APP_ROOT%") do set "APP_ROOT=%%~fi"
cd /d "%APP_ROOT%"

if "%SPRITE_VIDEO_LAB_HOST%"=="" set "SPRITE_VIDEO_LAB_HOST=127.0.0.1"
if "%SPRITE_VIDEO_LAB_PORT%"=="" set "SPRITE_VIDEO_LAB_PORT=8894"
if not "%SPRITE_VIDEO_LAB_PROXY%"=="" (
  set "HTTP_PROXY=%SPRITE_VIDEO_LAB_PROXY%"
  set "HTTPS_PROXY=%SPRITE_VIDEO_LAB_PROXY%"
)
if "%SPRITE_VIDEO_LAB_AI_MODEL_CACHE%"=="" set "SPRITE_VIDEO_LAB_AI_MODEL_CACHE=%APP_ROOT%\..\sprite-video-lab-models\huggingface"
if "%SPRITE_VIDEO_LAB_CORRIDORKEY_ROOT%"=="" set "SPRITE_VIDEO_LAB_CORRIDORKEY_ROOT=%APP_ROOT%\..\sprite-video-lab-models\CorridorKey"
if "%HF_HOME%"=="" set "HF_HOME=%SPRITE_VIDEO_LAB_AI_MODEL_CACHE%"
if "%HUGGINGFACE_HUB_CACHE%"=="" set "HUGGINGFACE_HUB_CACHE=%SPRITE_VIDEO_LAB_AI_MODEL_CACHE%\hub"
if "%TRANSFORMERS_CACHE%"=="" set "TRANSFORMERS_CACHE=%SPRITE_VIDEO_LAB_AI_MODEL_CACHE%\transformers"
if "%HF_MODULES_CACHE%"=="" set "HF_MODULES_CACHE=%SPRITE_VIDEO_LAB_AI_MODEL_CACHE%\modules"
if "%HF_XET_CACHE%"=="" set "HF_XET_CACHE=%SPRITE_VIDEO_LAB_AI_MODEL_CACHE%\xet"
if "%HF_HUB_DISABLE_SYMLINKS_WARNING%"=="" set "HF_HUB_DISABLE_SYMLINKS_WARNING=1"
if "%SPRITE_VIDEO_LAB_REALESRGAN_BIN%"=="" set "SPRITE_VIDEO_LAB_REALESRGAN_BIN=%APP_ROOT%\..\tools\realesrgan-ncnn-vulkan\realesrgan-ncnn-vulkan.exe"
if "%SPRITE_VIDEO_LAB_REALESRGAN_MODEL_DIR%"=="" set "SPRITE_VIDEO_LAB_REALESRGAN_MODEL_DIR=%APP_ROOT%\..\tools\realesrgan-ncnn-vulkan\models"

set "PYTHON_EXE="
if not "%SPRITE_VIDEO_LAB_PYTHON%"=="" if exist "%SPRITE_VIDEO_LAB_PYTHON%" (
  set "PYTHON_EXE=%SPRITE_VIDEO_LAB_PYTHON%"
  goto :python_ready
)
if exist "%APP_ROOT%\.venv-ai\Scripts\python.exe" (
  set "PYTHON_EXE=%APP_ROOT%\.venv-ai\Scripts\python.exe"
  goto :python_ready
)
if exist "%APP_ROOT%\.venv\Scripts\python.exe" (
  set "PYTHON_EXE=%APP_ROOT%\.venv\Scripts\python.exe"
  goto :python_ready
)
if exist "%APP_ROOT%\..\sprite-video-lab-models\venv\Scripts\python.exe" (
  set "PYTHON_EXE=%APP_ROOT%\..\sprite-video-lab-models\venv\Scripts\python.exe"
  goto :python_ready
)
for /f "delims=" %%i in ('where python 2^>nul') do (
  set "PYTHON_EXE=%%i"
  goto :python_ready
)
for /f "delims=" %%i in ('where py 2^>nul') do (
  set "PYTHON_EXE=%%i"
  goto :python_ready
)

echo Python not found.
exit /b 1

:python_ready
set "SPRITE_VIDEO_LAB_PYTHON=%PYTHON_EXE%"
"%PYTHON_EXE%" -c "import PIL" >nul 2>nul
if errorlevel 1 (
  echo Missing base Python dependency: Pillow
  echo Run setup_and_start.bat for first-time setup, or install requirements.txt into:
  echo   %PYTHON_EXE%
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$serverPath = [System.IO.Path]::GetFullPath('%APP_ROOT%\server.py');" ^
  "$escaped = [Regex]::Escape($serverPath);" ^
  "$self = $PID;" ^
  "$port = [int]'%SPRITE_VIDEO_LAB_PORT%';" ^
  "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $self -and $_.CommandLine -and $_.CommandLine -match $escaped } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} };" ^
  "Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $ownerPid = $_.OwningProcess; $proc = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessId -eq $ownerPid }; if ($proc.CommandLine -and $proc.CommandLine -match 'server\.py' -and ($proc.CommandLine -match 'sprite-video-lab' -or $proc.CommandLine -match 'SVL')) { try { Stop-Process -Id $ownerPid -Force -ErrorAction Stop } catch {} } }"

start "Sprite Video Lab Server" "%PYTHON_EXE%" "%APP_ROOT%\server.py" --serve --host "%SPRITE_VIDEO_LAB_HOST%" --port "%SPRITE_VIDEO_LAB_PORT%"
timeout /t 2 >nul
start "" http://%SPRITE_VIDEO_LAB_HOST%:%SPRITE_VIDEO_LAB_PORT%
