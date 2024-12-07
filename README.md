# 微信 DAT 文件转换器

一个在线工具，用于将微信的 DAT 文件转换为正常的图片文件。

## 功能特点

- 支持批量选择 DAT 文件
- 支持 JPEG、PNG、GIF 格式
- 纯浏览器端处理，无需上传文件
- 支持批量下载转换后的图片

## 使用方法

1. 访问 [在线转换工具](https://your-domain.vercel.app)
2. 点击"选择微信dat文件"按钮
3. 选择一个或多个 DAT 文件
4. 等待转换完成
5. 点击单个图片下方的"下载"按钮下载，或使用"全部下载"按钮

## 本地开发

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/web_dat_processor.git
   ```

2. 进入项目目录：
   ```bash
   cd web_dat_processor
   ```

3. 使用任意 HTTP 服务器运行项目，例如：
   ```bash
   python -m http.server 3000
   ```

4. 访问 `http://localhost:3000`

## 技术说明

- 纯前端实现，无需后端服务
- 使用 HTML5 File API 处理文件
- 使用 Blob API 生成下载链接
- 支持多种图片格式的解密 