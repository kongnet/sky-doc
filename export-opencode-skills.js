const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

const skillsDir = '/home/sky/.openclaw/skills';

async function findOrCreatePage() {
  console.log('🔍 搜索 "OpenCode 配置" 页面...');
  
  const searchResponse = await notion.search({
    query: 'OpenCode 配置',
    filter: { value: 'page', property: 'object' }
  });

  const activePage = searchResponse.results.find(p => !p.archived);
  if (activePage) {
    console.log('✅ 找到现有页面:', activePage.id);
    return activePage.id;
  }

  // 创建新页面
  console.log('📝 创建新的 "OpenCode 配置" 页面...');
  
  const parentSearch = await notion.search({
    query: '',
    filter: { value: 'page', property: 'object' },
    page_size: 1
  });

  if (parentSearch.results.length === 0) {
    throw new Error('未找到父页面');
  }

  const newPage = await notion.pages.create({
    parent: { page_id: parentSearch.results[0].id },
    properties: {
      title: { title: [{ text: { content: '💻 OpenCode 配置' } }] }
    }
  });

  console.log('✅ 创建成功:', newPage.id);
  return newPage.id;
}

async function addHeader(pageId) {
  const now = new Date().toLocaleString('zh-CN');
  
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ 
            text: { content: `📅 导出时间: ${now}\n🎯 OpenCode 版本: 1.2.24\n📦 技能数量: 16个` }
          }],
          icon: { emoji: '💻' }
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: '本文档包含 OpenCode 的所有技能配置，方便迁移到新机器。' } }]
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      }
    ]
  });
}

async function addSkillsOverview(pageId) {
  console.log('\n📋 添加技能概览...');
  
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: '📦 技能列表概览' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: `共 ${skills.length} 个技能:` } }]
        }
      }
    ]
  });

  // 添加技能列表（每行3个）
  for (let i = 0; i < skills.length; i += 3) {
    const row = skills.slice(i, i + 3);
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              { text: { content: row.join(' • ') } }
            ]
          }
        }
      ]
    });
  }

  return skills;
}

async function addSkillDetails(pageId, skillName) {
  const skillPath = path.join(skillsDir, skillName);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  
  if (!fs.existsSync(skillMdPath)) {
    console.log(`   ⚠️  跳过 ${skillName} (无 SKILL.md)`);
    return;
  }

  console.log(`   📝 添加: ${skillName}`);
  
  const content = fs.readFileSync(skillMdPath, 'utf8');
  const lines = content.split('\n');
  
  // 提取标题（从 frontmatter 或第一个标题）
  let title = skillName;
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch) {
    title = titleMatch[1];
  }
  
  // 提取描述（从 frontmatter 或第一段）
  let description = '';
  const descMatch = content.match(/description:\s*(.+)/);
  if (descMatch) {
    description = descMatch[1];
  } else {
    // 找第一个非空段落
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
        description = line.trim();
        break;
      }
    }
  }
  
  // 添加技能标题和描述
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: `🔧 ${title}` } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: description || '暂无描述' } }]
        }
      }
    ]
  });
  
  // 添加代码块（前2000字符）
  const codeContent = content.substring(0, 1900);
  if (codeContent) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ text: { content: codeContent } }],
            language: 'markdown'
          }
        }
      ]
    });
  }
  
  // 如果有更多内容，提示查看文件
  if (content.length > 1900) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ text: { content: `📄 完整文档较长，请查看源文件: ~/.openclaw/skills/${skillName}/SKILL.md` } }],
            icon: { emoji: '📄' },
            color: 'gray_background'
          }
        }
      ]
    });
  }
}

async function addMigrationGuide(pageId, skills) {
  console.log('\n📖 添加迁移指南...');
  
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: '🚀 迁移指南' } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '1. 备份技能目录' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: '# 压缩技能目录\ntar -czf opencode-skills-backup.tar.gz ~/.openclaw/skills/' } }],
          language: 'shell'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '2. 安装 OpenCode' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: 'pnpm add -g opencode-ai@latest' } }],
          language: 'shell'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '3. 恢复技能' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: '# 解压到新的机器\nmkdir -p ~/.openclaw\ntar -xzf opencode-skills-backup.tar.gz -C ~/' } }],
          language: 'shell'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '4. 安装依赖' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: `# 为有 package.json 的技能安装依赖\nfor skill in ~/.openclaw/skills/*/; do\n  if [ -f "\$skill/package.json" ]; then\n    cd "\$skill" && npm install\n  fi\ndone` } }],
          language: 'shell'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '5. 验证安装' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: 'opencode --version\nls -la ~/.openclaw/skills/' } }],
          language: 'shell'
        }
      }
    ]
  });
}

async function addDirectoryStructure(pageId) {
  console.log('\n📁 添加目录结构...');
  
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: '📁 目录结构' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: `~/.openclaw/
├── skills/
│   ├── audit-website/      # 网站审计
│   ├── frontend-design/    # 前端设计
│   ├── gws/                # Google Workspace
│   ├── ontology/           # 知识图谱
│   ├── rss-reader/         # RSS阅读器
│   ├── self-improving-agent/  # 自我改进
│   ├── sentiment-analyzer/    # 情感分析
│   ├── sentiment-reporter/    # 情感报告
│   ├── server-operator/       # 服务器操作
│   ├── skill-vetter/          # 技能审查
│   ├── sky-base/              # Skybase框架
│   ├── sky-meeko/             # Meeko工具库
│   ├── sky-mysql/             # MySQL操作
│   ├── sky-redis/             # Redis操作
│   ├── sky-rts/               # 实时统计
│   └── tavily-search/         # Tavily搜索
└── workspace/
    ├── AGENTS.md
    ├── SOUL.md
    ├── TOOLS.md
    └── ...` } }],
          language: 'plain text'
        }
      }
    ]
  });
}

async function main() {
  try {
    console.log('💻 开始导出 OpenCode 技能到 Notion...\n');
    
    const pageId = await findOrCreatePage();
    await addHeader(pageId);
    const skills = await addSkillsOverview(pageId);
    
    // 添加每个技能的详细信息
    console.log('\n📚 添加技能详细信息...');
    for (const skill of skills) {
      await addSkillDetails(pageId, skill);
    }
    
    await addDirectoryStructure(pageId);
    await addMigrationGuide(pageId, skills);
    
    console.log('\n🎉 导出完成！');
    console.log(`🔗 页面链接: https://notion.so/${pageId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ 导出失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
