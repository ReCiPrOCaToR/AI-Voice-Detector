# 贡献指南

感谢您考虑为AI语音检测器项目做出贡献！

## 开发环境设置

1. 克隆仓库:
```bash
git clone https://github.com/yourusername/ai-voice-detector.git
cd ai-voice-detector
```

2. 安装依赖:
```bash
npm install
```

3. 开发模式运行:
```bash
npm run dev
```

4. 加载扩展进行测试:
   - 打开Chrome浏览器，进入扩展管理页面 (`chrome://extensions/`)
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"按钮
   - 选择项目中的`dist`文件夹

## 代码风格

- 遵循JavaScript标准代码风格
- 使用有意义的变量和函数名
- 添加必要的注释解释代码逻辑，特别是对于音频分析算法
- 使用ES6+语法
- 在提交前运行linter：`npm run lint`

## 提交变更

1. 创建新的分支进行开发:
```bash
git checkout -b feature/your-feature-name
```

2. 提交您的更改:
```bash
git commit -m "描述你的更改"
```

3. 推送到分支:
```bash
git push origin feature/your-feature-name
```

4. 提交Pull Request（PR）

## 功能开发建议

- **音频检测算法改进**: 欢迎针对不同类型的AI配音优化检测算法
- **用户界面优化**: 优化插件交互和视觉效果
- **性能优化**: 减少资源占用，提高检测速度
- **兼容性提升**: 支持更多的视频网站和浏览器

## 报告Bug

请使用GitHub Issues报告bug，包含以下信息:
- 预期行为
- 实际行为
- 重现步骤
- 浏览器和操作系统信息
- 查看控制台错误信息

## 代码审查

所有提交的代码将经过代码审查。请确保您的代码:
- 没有安全问题
- 性能良好
- 保持代码风格一致
- 包含必要的测试（如果适用）

感谢您的贡献！ 