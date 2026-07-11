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

if not "%SPRITE_VIDEO_LAB_PROXY%"=="" (
  set "HTTP_PROXY=%SPRITE_VIDEO_LAB_PROXY%"
  set "HTTPS_PROXY=%SPRITE_VIDEO_LAB_PROXY%"
)

if "%SPRITE_VIDEO_LAB_DATA_ROOT%"=="" set "SPRITE_VIDEO_LAB_DATA_ROOT=%APP_ROOT%\..\sprite-video-lab-models"
set "VENV_DIR=%SPRITE_VIDEO_LAB_DATA_ROOT%\venv"
set "SPRITE_VIDEO_LAB_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "SPRITE_VIDEO_LAB_AI_MODEL_CACHE=%SPRITE_VIDEO_LAB_DATA_ROOT%\huggingface"
set "SPRITE_VIDEO_LAB_CORRIDORKEY_ROOT=%SPRITE_VIDEO_LAB_DATA_ROOT%\CorridorKey"

echo.
echo Sprite Forge Lab first-run setup
echo This step only prepares the basic web runtime.
echo AI dependencies and models can be installed later in Model Management.
echo Runtime root:
echo   %SPRITE_VIDEO_LAB_DATA_ROOT%
echo.

if not exist "%SPRITE_VIDEO_LAB_DATA_ROOT%" mkdir "%SPRITE_VIDEO_LAB_DATA_ROOT%"

set "PY_LAUNCHER="
set "BOOTSTRAP_PYTHON="
for /f "delims=" %%i in ('where py 2^>nul') do (
  set "PY_LAUNCHER=%%i"
  goto :bootstrap_ready
)
for /f "delims=" %%i in ('where python 2^>nul') do (
  set "BOOTSTRAP_PYTHON=%%i"
  goto :bootstrap_ready
)

echo Python not found. Please install Python 3.10+ and run Start.exe again.
pause
exit /b 1

:bootstrap_ready
if not exist "%SPRITE_VIDEO_LAB_PYTHON%" (
  echo Creating runtime at %VENV_DIR%
  if not "%PY_LAUNCHER%"=="" (
    "%PY_LAUNCHER%" -3 -m venv "%VENV_DIR%"
  ) else (
    "%BOOTSTRAP_PYTHON%" -m venv "%VENV_DIR%"
  )
)

echo Installing basic dependencies...
"%SPRITE_VIDEO_LAB_PYTHON%" -m pip install --upgrade pip
"%SPRITE_VIDEO_LAB_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo Basic setup failed. Check the network, Python installation, or proxy settings.
  echo Optional proxy example:
  echo   set SPRITE_VIDEO_LAB_PROXY=http://127.0.0.1:7897
  pause
  exit /b 1
)

echo.
echo Basic setup finished. Starting Sprite Forge Lab...
if exist "%SCRIPT_DIR%start_sprite_video_lab.bat" (
  call "%SCRIPT_DIR%start_sprite_video_lab.bat"
) else (
  call "%APP_ROOT%\start_sprite_video_lab.bat"
)
