@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    在线投票系统 - 一键启动脚本
echo ========================================
echo.

set ROOT=%~dp0
set SERVER_DIR=%ROOT%server
set CLIENT_DIR=%ROOT%client

echo [1/6] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未安装 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo  版本: %%v
echo.

echo [2/6] 安装后端依赖...
cd /d "%SERVER_DIR%"
if not exist node_modules (
    echo  正在安装，首次可能需要几分钟...
    call npm install
    if errorlevel 1 (
        echo 错误: 后端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo  已存在 node_modules，跳过
)
echo.

echo [3/6] 安装前端依赖...
cd /d "%CLIENT_DIR%"
if not exist node_modules (
    echo  正在安装，首次可能需要几分钟...
    call npm install
    if errorlevel 1 (
        echo 错误: 前端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo  已存在 node_modules，跳过
)
echo.

echo [4/6] 初始化数据库...
cd /d "%SERVER_DIR%"
call npx ts-node src/db/init.ts
if errorlevel 1 (
    echo 警告: 数据库初始化可能已存在，继续...
)
echo.

echo [5/6] 构建前端...
cd /d "%CLIENT_DIR%"
call npm run build
if errorlevel 1 (
    echo 错误: 前端构建失败
    pause
    exit /b 1
)
echo.

echo [6/6] 启动服务...
echo ========================================
echo    系统已就绪!
echo    后端 API:  http://localhost:3001
echo    前端页面:  http://localhost:3001
echo    WebSocket: ws://localhost:3001/ws
echo.
echo    按 Ctrl+C 停止服务
echo ========================================
echo.

cd /d "%SERVER_DIR%"
call npx ts-node src/index.ts

endlocal
