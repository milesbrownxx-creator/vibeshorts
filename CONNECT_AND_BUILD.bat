@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
title VibeShorts Firebase Connector

echo ============================================================
echo VibeShorts - connect Firebase and build the website
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer from https://nodejs.org/
  echo Close and reopen this window after installation, then run this file again.
  pause
  exit /b 1
)
for /f %%N in ('node -p "parseInt(process.versions.node,10)"') do set NODE_MAJOR=%%N
if not defined NODE_MAJOR (
  echo Could not detect your Node.js version.
  pause
  exit /b 1
)
if %NODE_MAJOR% LSS 22 (
  echo This project needs Node.js 22 or newer. Your version is:
  node -v
  echo Install a current LTS release from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
echo Node.js version:
node -v
echo.
if exist ".env.local" goto haveconfig
echo In Firebase Console, open Project settings ^> Your apps ^> your Web app ^> SDK setup and configuration ^> Config.
echo Enter only the value inside the quotes. Do not enter quote marks or commas.
echo Use the exact storageBucket value Firebase displays.
echo.
set /p FB_API_KEY=Firebase apiKey: 
set /p FB_AUTH_DOMAIN=Firebase authDomain: 
set /p FB_PROJECT_ID=Firebase projectId: 
set /p FB_STORAGE_BUCKET=Firebase storageBucket: 
set /p FB_SENDER_ID=Firebase messagingSenderId: 
set /p FB_APP_ID=Firebase appId: 
if "%FB_API_KEY%"=="" goto missing
if "%FB_AUTH_DOMAIN%"=="" goto missing
if "%FB_PROJECT_ID%"=="" goto missing
if "%FB_STORAGE_BUCKET%"=="" goto missing
if "%FB_SENDER_ID%"=="" goto missing
if "%FB_APP_ID%"=="" goto missing

(
  echo VITE_FIREBASE_API_KEY=%FB_API_KEY%
  echo VITE_FIREBASE_AUTH_DOMAIN=%FB_AUTH_DOMAIN%
  echo VITE_FIREBASE_PROJECT_ID=%FB_PROJECT_ID%
  echo VITE_FIREBASE_STORAGE_BUCKET=%FB_STORAGE_BUCKET%
  echo VITE_FIREBASE_MESSAGING_SENDER_ID=%FB_SENDER_ID%
  echo VITE_FIREBASE_APP_ID=%FB_APP_ID%
) > .env.local

echo.
echo Firebase settings saved in .env.local. Do not share this local file publicly.
goto configready

:haveconfig
echo Existing .env.local found. Using the Firebase settings already saved in this folder.

:configready
echo Installing project dependencies. This needs an internet connection.
echo.
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Dependency installation failed. Check your internet and Node.js installation, then run this file again.
  pause
  exit /b 1
)
echo.
echo Building VibeShorts for Netlify...
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. Copy the error text and send it to ChatGPT for help.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo BUILD COMPLETE
echo Your website files are in the dist folder.
echo Before uploading, publish firestore.rules and storage.rules
echo in Firebase Console and check the Netlify domain is authorized.
echo Then open DEPLOY_TO_NETLIFY.txt for deployment steps.
echo ============================================================
pause
exit /b 0

:missing
echo.
echo One or more Firebase values were blank. Run this file again and fill all six values.
pause
exit /b 1
