@echo off
chcp 65001 > nul
echo ========================================
echo   Solana 监控机器人 - 系统检查
echo ========================================
echo.

echo [检查 1/4] Node.js 安装检查...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [×] 未安装 Node.js
    echo     请访问 https://nodejs.org/zh-cn/ 下载安装
) else (
    echo [√] 已安装 Node.js
    node --version
)
echo.

echo [检查 2/4] NPM 安装检查...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [×] 未安装 NPM
) else (
    echo [√] 已安装 NPM
    npm --version
)
echo.

echo [检查 3/4] 项目依赖检查...
if exist "backend\node_modules" (
    echo [√] 后端依赖已安装
) else (
    echo [×] 后端依赖未安装
    echo     运行启动脚本时会自动安装
)

if exist "frontend\node_modules" (
    echo [√] 前端依赖已安装
) else (
    echo [×] 前端依赖未安装
    echo     运行启动脚本时会自动安装
)
echo.

echo [检查 4/4] 配置文件检查...
if exist "backend\.env" (
    echo [√] 后端配置文件存在
) else (
    echo [×] 后端配置文件不存在
    echo     运行启动脚本时会自动创建
)
echo.

echo ========================================
echo   系统检查完成
echo ========================================
echo.
echo 如果所有检查都通过，可以运行"启动监控机器人.bat"
echo.
pause
