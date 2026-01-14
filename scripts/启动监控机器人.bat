@echo off
chcp 65001 > nul
echo ========================================
echo   Solana 监控机器人 - 一键启动脚本
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js!
    echo 请先安装 Node.js: https://nodejs.org/zh-cn/
    pause
    exit /b 1
)

echo [1/5] 检测到 Node.js 版本:
node --version
echo.

REM 检查后端依赖
if not exist "backend\node_modules" (
    echo [2/5] 首次运行，正在安装后端依赖...
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 后端依赖安装失败!
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [2/5] 后端依赖已安装
)

REM 检查前端依赖
if not exist "frontend\node_modules" (
    echo [3/5] 首次运行，正在安装前端依赖...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 前端依赖安装失败!
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [3/5] 前端依赖已安装
)

REM 检查后端配置文件
if not exist "backend\.env" (
    echo [4/5] 创建后端配置文件...
    copy backend\.env.example backend\.env >nul
    echo 已创建配置文件，请编辑 backend\.env 进行配置
) else (
    echo [4/5] 后端配置文件已存在
)

echo.
echo [5/5] 正在启动服务...
echo.
echo ========================================
echo   后端服务将在新窗口启动
echo   前端服务将在新窗口启动
echo   请不要关闭这些窗口！
echo ========================================
echo.

REM 启动后端（新窗口）
start "Solana 监控机器人 - 后端服务" cmd /k "cd backend && npm run dev"

REM 等待后端启动
echo 等待后端服务启动...
timeout /t 5 /nobreak >nul

REM 启动前端（新窗口）
start "Solana 监控机器人 - 前端界面" cmd /k "cd frontend && npm run dev"

REM 等待前端启动
echo 等待前端服务启动...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   后端地址: http://localhost:3001
echo   前端地址: http://localhost:3000
echo.
echo   浏览器将自动打开前端界面...
echo.
echo   提示：
echo   - 如需停止服务，请关闭对应的窗口
echo   - 查看日志：backend\logs\monitor.log
echo   - 遇到问题？查看文档：docs\README_CN.md
echo.
echo ========================================
pause

REM 打开浏览器
timeout /t 3 /nobreak >nul
start http://localhost:3000
