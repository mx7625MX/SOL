@echo off
chcp 65001 > nul
echo ========================================
echo   Solana 监控机器人 - 停止所有服务
echo ========================================
echo.

echo 正在查找并停止 Node.js 进程...

REM 停止前端进程
for /f "tokens=2" %%a in ('tasklist ^| findstr "node.exe"') do (
    taskkill /PID %%a /F >nul 2>nul
)

echo.
echo ========================================
echo   所有服务已停止
echo ========================================
echo.
pause
