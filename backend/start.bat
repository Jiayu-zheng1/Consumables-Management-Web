@echo off
chcp 65001 >nul
title 耗材管理系统 - 后端

echo ========================================
echo   耗材管理系统 - 后端服务启动
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查 Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version

echo [2/3] 安装依赖...
pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo [3/3] 启动后端服务 (端口 8000)...
echo.
echo 后端地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo 按 Ctrl+C 停止服务
echo.
python main.py

pause
