# Github上传指南

本文档提供了将AI语音检测器项目上传到Github的详细步骤。

## 准备工作

1. 确保安装了Git：https://git-scm.com/downloads
2. 创建一个Github账号：https://github.com/signup
3. 创建一个新的Github仓库：
   - 登录Github
   - 点击右上角的"+"图标，选择"New repository"
   - 填写仓库名称，如"AI-Voice-Detector"
   - 添加项目描述
   - 选择仓库可见性（公开或私有）
   - 不要添加README、LICENSE或.gitignore文件（我们已经准备好了）
   - 点击"Create repository"

## 初始化本地仓库并上传

打开命令行终端，执行以下命令：

```bash
# 进入项目目录
cd path/to/AI-Voice-Detector

# 初始化Git仓库
git init

# 添加所有文件到Git暂存区
git add .

# 提交更改
git commit -m "初始提交：AI语音检测器项目"

# 添加远程仓库地址（替换YOUR_USERNAME为你的Github用户名）
git remote add origin https://github.com/YOUR_USERNAME/AI-Voice-Detector.git

# 推送到Github
git push -u origin main
# 如果默认分支是master而不是main，使用：
# git push -u origin master
```

## 推送更新

之后每次修改后，使用以下命令推送更新：

```bash
# 添加更改的文件
git add .

# 提交更改
git commit -m "更新描述"

# 推送到Github
git push
```

## 使用Github Pages展示项目文档（可选）

1. 在Github仓库页面点击"Settings"
2. 在左侧菜单选择"Pages"
3. 在"Source"部分，选择分支（通常是main或master）
4. 点击"Save"
5. 稍等片刻，Github会提供一个链接，可以访问你的项目文档

## 添加README徽章（可选）

可以在README.md中添加以下徽章，使项目看起来更专业：

```markdown
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
```

## 疑难解答

- **无法推送到Github**：确保你有正确的权限，并且已经通过身份验证
- **冲突问题**：如果远程仓库有你本地没有的更改，先执行`git pull`再尝试推送
- **大文件问题**：Github有文件大小限制，如果遇到问题，考虑使用Git LFS

## 其他资源

- [Github文档](https://docs.github.com/)
- [Git教程](https://git-scm.com/book/zh/v2)
- [Github Desktop](https://desktop.github.com/)（图形界面Git客户端） 