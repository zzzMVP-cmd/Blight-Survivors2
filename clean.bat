@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在清理临时文件...

if exist "release\" (
    echo 删除 release\ 目录...
    rmdir /s /q "release"
)
if exist "packed\" (
    echo 删除 packed\ 目录...
    rmdir /s /q "packed"
)
if exist "dist\" (
    echo 删除 dist\ 目录...
    rmdir /s /q "dist"
)

echo ========================================
echo   清理完成！
echo ========================================
pause