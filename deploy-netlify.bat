@echo off
echo ============================================
echo  全科医学刷题 - 部署到 Netlify
echo ============================================
echo.
echo 步骤 1: 打开浏览器访问 https://app.netlify.com/drop
echo 步骤 2: 将 dist 文件夹拖入浏览器窗口
echo 步骤 3: 等待几秒，Netlify 会给你一个 https://xxx.netlify.app 地址
echo 步骤 4: 手机打开这个地址，添加到主屏幕即可永久离线使用
echo.
echo 提示: dist 文件夹位于本项目目录下
echo       路径: %~dp0dist
echo.
pause
start https://app.netlify.com/drop
