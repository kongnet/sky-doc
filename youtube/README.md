# YouTube 分析报告目录

此目录用于存放 YouTube 关键字分析报告。

## 文件命名规则

- JSON 数据: `{keyword}.json`
- HTML 报告: `{keyword}.html`

## 示例

- `depin.json` - DePIN 关键字视频数据
- `depin.html` - DePIN 关键字分析报告

## 生成报告

使用工作流脚本生成:

```bash
cd /home/sky/tools
node youtube-analysis-workflow.js "关键字"
```

报告将自动保存到此目录。
