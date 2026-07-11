@echo off
setlocal
cd /d "%~dp0"

if not "%SPRITE_VIDEO_LAB_PROXY%"=="" (
  set "HTTP_PROXY=%SPRITE_VIDEO_LAB_PROXY%"
  set "HTTPS_PROXY=%SPRITE_VIDEO_LAB_PROXY%"
)

if "%SPRITE_VIDEO_LAB_DATA_ROOT%"=="" set "SPRITE_VIDEO_LAB_DATA_ROOT=%~dp0..\sprite-video-lab-models"
set "SPRITE_VIDEO_LAB_AI_MODEL_CACHE=%SPRITE_VIDEO_LAB_DATA_ROOT%\huggingface"
set "SPRITE_VIDEO_LAB_CORRIDORKEY_ROOT=%SPRITE_VIDEO_LAB_DATA_ROOT%\CorridorKey"
set "SPRITE_VIDEO_LAB_PYTHON=%SPRITE_VIDEO_LAB_DATA_ROOT%\venv\Scripts\python.exe"
set "SPRITE_VIDEO_LAB_NO_PAUSE=1"

echo.
echo Sprite Forge Lab first-run setup
echo Runtime root:
echo   %SPRITE_VIDEO_LAB_DATA_ROOT%
echo.

call "%~dp0setup_ai_runtime.bat"
if errorlevel 1 (
  echo.
  echo Setup failed. Check the network, Python installation, or proxy settings.
  echo Optional proxy example:
  echo   set SPRITE_VIDEO_LAB_PROXY=http://127.0.0.1:7897
  pause
  exit /b 1
)

echo.
echo Setup finished. Starting Sprite Forge Lab...
call "%~dp0start_sprite_video_lab.bat"
