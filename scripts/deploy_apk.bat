@echo off
REM =============================================================================
REM PAYSAFE POS APK BUILD & DEPLOY SCRIPT (Windows)
REM =============================================================================
REM This script automates the entire APK release process:
REM 1. Detects local IP automatically
REM 2. Builds the Flutter APK
REM 3. Calculates SHA256 hash
REM 4. Copies APK to Next.js public folder
REM 5. Updates database with new version info
REM =============================================================================

setlocal enabledelayedexpansion

REM ===== AUTO-DETECT IP ADDRESS =====
for /f "tokens=14" %%a in ('ipconfig ^| findstr "IPv4 Address"') do set IP_ADDRESS=%%a
set IP_ADDRESS=%IP_ADDRESS: =%
echo Detected Network IP: %IP_ADDRESS%

REM ===== CONFIGURATION =====
set APP_NAME=paysafe_pos
set FLUTTER_DIR=%~dp0..\terminal_pos_android
set BACKEND_DIR=%~dp0..\backend-api
:: Use Backend static folder instead of Next.js public folder
set APK_OUTPUT_DIR=%~dp0..\backend-api\static\apk
:: URL points to Backend API (FastAPI) which now serves static files
set APK_BASE_URL=http://%IP_ADDRESS%:8000/static/apk

REM =============================================================================
echo.
echo ==============================================
echo PAYSAFE POS APK BUILD AND DEPLOY
echo ==============================================
echo.

REM Step 1: Get current version from pubspec.yaml
echo [1/6] Reading version info...
cd /d "%FLUTTER_DIR%"
for /f "tokens=2 delims=: " %%a in ('findstr /B "version:" pubspec.yaml') do (
    for /f "tokens=1 delims=+" %%v in ("%%a") do set CURRENT_VERSION=%%v
    for /f "tokens=2 delims=+" %%c in ("%%a") do set CURRENT_CODE=%%c
)
echo Current Version: %CURRENT_VERSION%+%CURRENT_CODE%
echo.

REM Ask for new version
set /p NEW_VERSION="Enter NEW version (or press Enter to keep %CURRENT_VERSION%): "
if "%NEW_VERSION%"=="" (
    set VERSION=%CURRENT_VERSION%
    set VERSION_CODE=%CURRENT_CODE%
) else (
    set VERSION=%NEW_VERSION%
    set /a VERSION_CODE=%CURRENT_CODE%+1
    echo Updating pubspec.yaml to version %NEW_VERSION%+!VERSION_CODE!...
    powershell -Command "(Get-Content pubspec.yaml) -replace 'version: .*', 'version: %NEW_VERSION%+!VERSION_CODE!' | Set-Content pubspec.yaml"
)
set APK_FILENAME=%APP_NAME%_%VERSION%.apk
echo.
echo Building: %VERSION%+%VERSION_CODE%
echo APK Filename: %APK_FILENAME%
echo.

REM Step 2: Build APK
echo [2/5] Building Release APK...
call flutter clean
call flutter pub get
call flutter build apk --release
if errorlevel 1 (
    echo ERROR: Flutter build failed!
    exit /b 1
)
echo.

REM Step 3: Copy APK
echo [3/5] Processing APK...
set SOURCE_APK=%FLUTTER_DIR%\build\app\outputs\flutter-apk\app-release.apk
if not exist "%APK_OUTPUT_DIR%" mkdir "%APK_OUTPUT_DIR%"
set DEST_APK=%APK_OUTPUT_DIR%\%APK_FILENAME%
copy /Y "%SOURCE_APK%" "%DEST_APK%"
echo APK copied to: %DEST_APK%
echo.

REM Step 4: Calculate SHA256
echo [4/5] Calculating SHA256 Hash...
for /f "skip=1 tokens=*" %%h in ('certutil -hashfile "%DEST_APK%" SHA256') do (
    set SHA256=%%h
    goto :hashDone
)
:hashDone
REM Remove spaces from hash
set SHA256=%SHA256: =%
echo SHA256: %SHA256%

REM Get file size
for %%A in ("%DEST_APK%") do set FILE_SIZE=%%~zA
echo File Size: %FILE_SIZE% bytes
echo.

REM Step 5: Update database using Python
echo [5/5] Updating Database...
set APK_URL=%APK_BASE_URL%/%APK_FILENAME%

set /p MIN_VERSION="Enter minimum required version (Enter for %VERSION%): "
if "%MIN_VERSION%"=="" set MIN_VERSION=%VERSION%

set /p FORCE_UPDATE="Force update for all users? (y/N): "
if /i "%FORCE_UPDATE%"=="y" (
    set FORCE_UPDATE_VAL=1
) else (
    set FORCE_UPDATE_VAL=0
)

set /p RELEASE_NOTES="Enter release notes: "

REM Use Python script to update database
cd /d "%BACKEND_DIR%"
python scripts\update_app_version.py "%VERSION%" %VERSION_CODE% "%MIN_VERSION%" "%APK_FILENAME%" "%APK_URL%" "%SHA256%" %FILE_SIZE% "%RELEASE_NOTES%" %FORCE_UPDATE_VAL%
if errorlevel 1 (
    echo ERROR: Database update failed!
    pause
    exit /b 1
)
echo.

REM Summary
echo ==============================================
echo DEPLOYMENT COMPLETE
echo ==============================================
echo Version: %VERSION%
echo APK URL: %APK_URL%
echo SHA256: %SHA256%
echo Min Required: %MIN_VERSION%
echo Force Update: %FORCE_UPDATE_VAL%
echo APK Location: %DEST_APK%
echo.
echo POS devices will now receive this update!
echo.
pause
