@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 18 or newer before starting V2.
  pause
  exit /b 1
)
if exist "%~dp0tools\ffmpeg\bin\ffmpeg.exe" set "PATH=%~dp0tools\ffmpeg\bin;%PATH%"
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg is missing. Extract the complete owner ZIP, including tools.
  pause
  exit /b 1
)
where ffprobe >nul 2>nul
if errorlevel 1 (
  echo FFprobe is missing. Extract the complete owner ZIP, including tools.
  pause
  exit /b 1
)
set "AIVM_V2_WEB_PORT=8094"
set "AIVM_MOCK=0"
echo Studio: http://127.0.0.1:8094/v2/
echo Keep this window open. Press Ctrl+C to stop Studio and the bridge.
start "" "http://127.0.0.1:8094/v2/"
node v2/start.mjs
echo Studio stopped. Any startup errors are shown above.
pause
