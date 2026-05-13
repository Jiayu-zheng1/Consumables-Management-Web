@echo off
chcp 65001 >nul
title 耗材管理系统 - 一键启动

echo ========================================
echo   耗材管理系统 v1.0
echo ========================================
echo.
echo   后端: http://localhost:8000
echo   前端: http://localhost:3000
echo   局域网: http://%COMPUTERNAME%:3000
echo.
echo ========================================

cd /d "%~dp0"

echo [启动后端] ...
start "耗材后端-8000" cmd /c "cd /d %~dp0backend && python main.py"

echo [启动前端] ...
start "耗材前端-3000" cmd /c "cd /d %~dp0frontend && npm run build 2>nul && npx next start -p 3000"

echo.
echo 服务启动中，请稍候...
echo 后端约3秒，前端约10秒后可用
echo.
echo 关闭此窗口不会停止服务，请在两个服务窗口中按 Ctrl+C 停止
echo ========================================

pause
