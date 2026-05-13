@echo off
chcp 65001 >nul
title 耗材管理系统 - 前端

echo ========================================
echo   耗材管理系统 - 前端服务启动
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
node --version

echo [2/3] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] npm install 失败
    pause
    exit /b 1
)

echo [3/3] 编译并启动前端 (端口 3000)...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 编译失败
    pause
    exit /b 1
)

echo.
echo 前端地址: http://localhost:3000
echo 局域网访问: http://%COMPUTERNAME%:3000
echo 按 Ctrl+C 停止服务
echo.
call npx next start -p 3000

pause
