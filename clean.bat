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
if exist "www\" (
    echo 删除 www\ 目录...
    rmdir /s /q "www"
)
if exist "android\app\build\" (
    echo 删除 android\app\build\ 目录...
    rmdir /s /q "android\app\build"
)
if exist "android\build\" (
    echo 删除 android\build\ 目录...
    rmdir /s /q "android\build"
)
if exist "android\.gradle\" (
    echo 删除 android\.gradle\ 目录...
    rmdir /s /q "android\.gradle"
)

echo ========================================
echo   清理完成！
echo ========================================
pause