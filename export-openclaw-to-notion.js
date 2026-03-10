const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

// 需要导出的核心配置文件
const coreFiles = {
  'main': '/home/sky/.openclaw/openclaw.json',
  'agents': '/home/sky/.openclaw/agents/main/agent',
};

// 需要导出的核心 MD 文档
const coreDocs = [
  { name: 'AGENTS.md', path: '/home/sky/.openclaw/workspace/AGENTS.md', desc: '智能体配置指南' },
  { name: 'BOOTSTRAP.md', path: '/home/sky/.openclaw/workspace/BOOTSTRAP.md', desc: '启动配置说明' },
  { name: 'HEARTBEAT.md', path: '/home/sky/.openclaw/workspace/HEARTBEAT.md', desc: '心跳日志' },
  { name: 'IDENTITY.md', path: '/home/sky/.openclaw/workspace/IDENTITY.md', desc: '身份配置' },
  { name: 'SOUL.md', path: '/home/sky/.openclaw/workspace/SOUL.md', desc: '核心设定' },
  { name: 'TOOLS.md', path: '/home/sky/.openclaw/workspace/TOOLS.md', desc: '工具配置' },
  { name: 'USER.md', path: '/home/sky/.openclaw/workspace/USER.md', desc: '用户信息' }
];

// 自定义技能文档
const skills = [
  { name: 'audit-website', desc: '网站审计技能' },
  { name: 'frontend-design', desc: '前端设计技能' },
  { name: 'sentiment-analyzer', desc: '情感分析技能' },
  { name: 'sentiment-reporter', desc: '情感报告技能' },
  { name: 'server-operator', desc: '服务器操作技能' },
  { name: 'sky-base', desc: 'Skybase框架技能' },
  { name: 'sky-mysql', desc: 'MySQL数据库技能' },
  { name: 'sky-redis', desc: 'Redis缓存技能' },
  { name: 'sky-rts', desc: '实时统计技能' },
  { name: 'tavily-search', desc: 'Tavily搜索技能' }
];

async function findOrCreateMigrationPage() {
  console.log('🔍 搜索 "龙虾迁移配置" 页面...');
  
  const searchResponse = await notion.search({
    query: '龙虾迁移配置',
    filter: { value: 'page', property: 'object' }
  });

  if (searchResponse.results.length > 0) {
    const activePage = searchResponse.results.find(p => !p.archived);
    if (activePage) {
      console.log('✅ 找到现有页面:', activePage.id);
      return activePage.id;
    }
  }

  // 创建新页面
  console.log('📝 创建新的 "龙虾迁移配置" 页面...');
  
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
      title: { title: [{ text: { content: '🦞龙虾迁移配置' } }] }
    }
  });

  console.log('✅ 创建成功:', newPage.id);
  return newPage.id;
}

async function createTableOfContents(pageId) {
  console.log('\n📝 添加目录和说明...');
  
  const now = new Date().toLocaleString('zh-CN');
  
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ 
            text: { 
              content: `📅 导出时间: ${now}\n🦞 OpenClaw 版本: 2026.3.8\n📦 包含内容: 配置文件、核心文档、技能说明` 
            } 
          }],
          icon: { emoji: '📦' }
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: '本文档包含龙虾(OpenClaw)的所有配置和核心文档，方便迁移到新机器。' } }]
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: '📋 目录' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '核心配置文件 (openclaw.json)' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '核心文档 (MD文件)' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '自定义技能列表' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '迁移步骤清单' } }]
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

async function addOpenClawConfig(pageId) {
  console.log('\n🔧 添加核心配置...');
  
  const configContent = fs.readFileSync(coreFiles.main, 'utf8');
  const config = JSON.parse(configContent);
  
  // 清理敏感信息
  const safeConfig = JSON.parse(JSON.stringify(config));
  if (safeConfig.channels?.telegram?.botToken) {
    safeConfig.channels.telegram.botToken = '***REDACTED***';
  }
  
  // 分段JSON内容
  const jsonStr = JSON.stringify(safeConfig, null, 2);
  const chunks = jsonStr.match(/[\s\S]{1,1900}/g) || [jsonStr];
  
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: '1️⃣ 核心配置文件' } }]
        }
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ 
            text: { 
              content: '⚠️ 注意: 敏感信息（如 API Token）已隐藏，迁移时需重新配置' 
            } 
          }],
          icon: { emoji: '⚠️' },
          color: 'yellow_background'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📁 openclaw.json' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: chunks[0] } }],
          language: 'json'
        }
      }
    ]
  });
  
  // 添加剩余块
  for (let i = 1; i < chunks.length; i++) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ text: { content: chunks[i] } }],
            language: 'json'
          }
        }
      ]
    });
  }
}

async function addCoreDocs(pageId) {
  console.log('\n📄 添加核心文档...');
  
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
          rich_text: [{ text: { content: '2️⃣ 核心文档' } }]
        }
      }
    ]
  });
  
  for (const doc of coreDocs) {
    if (fs.existsSync(doc.path)) {
      const content = fs.readFileSync(doc.path, 'utf8');
      
      // 分割长文档
      const chunks = content.match(/[\s\S]{1,1900}/g) || [content];
      
      await notion.blocks.children.append({
        block_id: pageId,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ text: { content: `📄 ${doc.name}` } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                text: { content: `💡 ${doc.desc}` },
                annotations: { italic: true, color: 'gray' }
              }]
            }
          },
          {
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ text: { content: chunks[0] } }],
              language: 'markdown'
            }
          }
        ]
      });
      
      // 如果文档太长，添加后续部分
      if (chunks.length > 1) {
        for (let i = 1; i < chunks.length; i++) {
          await notion.blocks.children.append({
            block_id: pageId,
            children: [
              {
                object: 'block',
                type: 'code',
                code: {
                  rich_text: [{ text: { content: chunks[i] } }],
                  language: 'markdown'
                }
              }
            ]
          });
        }
      }
      
      console.log(`   ✅ ${doc.name}`);
    } else {
      console.log(`   ⚠️  跳过: ${doc.name} (不存在)`);
    }
  }
}

async function addSkillsList(pageId) {
  console.log('\n🛠️ 添加技能列表...');
  
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
          rich_text: [{ text: { content: '3️⃣ 自定义技能列表' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: '以下技能位于 ~/.openclaw/skills/ 目录下，迁移时需要复制：' } }]
        }
      }
    ]
  });
  
  for (const skill of skills) {
    const skillPath = `/home/sky/.openclaw/skills/${skill.name}`;
    const exists = fs.existsSync(skillPath);
    
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              { text: { content: `${skill.name} - ${skill.desc} ` } },
              { text: { content: exists ? '✅' : '❌' } }
            ]
          }
        }
      ]
    });
  }
}

async function addMigrationSteps(pageId) {
  console.log('\n📋 添加迁移步骤...');
  
  const steps = [
    '安装 OpenClaw: pnpm add -g openclaw@latest',
    '复制配置文件: cp openclaw.json ~/.openclaw/',
    '安装自定义技能: 复制 skills/ 目录到 ~/.openclaw/skills/',
    '复制核心文档: 复制 workspace/*.md 到 ~/.openclaw/workspace/',
    '配置 API Keys: 设置 Telegram Bot Token、Notion API Key 等',
    '配置 Notion: mkdir -p ~/.config/notion && echo "KEY" > api_key',
    '启动服务: systemctl --user start openclaw-gateway',
    '验证: openclaw --version && 检查 Web UI'
  ];
  
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
          rich_text: [{ text: { content: '4️⃣ 迁移步骤清单' } }]
        }
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ 
            text: { content: '按顺序执行以下步骤完成迁移' } 
          }],
          icon: { emoji: '📌' },
          color: 'blue_background'
        }
      }
    ]
  });
  
  for (let i = 0; i < steps.length; i++) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ 
              text: { content: steps[i] },
  
            }]
          }
        }
      ]
    });
  }
  
  // 添加重要目录结构
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📁 重要目录结构' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ 
            text: { content: `~/.openclaw/
├── openclaw.json          # 主配置文件
├── workspace/
│   ├── AGENTS.md          # 智能体配置
│   ├── TOOLS.md           # 工具配置
│   ├── SOUL.md            # 核心设定
│   ├── USER.md            # 用户信息
│   ├── IDENTITY.md        # 身份配置
│   ├── BOOTSTRAP.md       # 启动配置
│   └── HEARTBEAT.md       # 心跳日志
├── skills/                # 自定义技能
│   ├── server-operator/
│   ├── sentiment-analyzer/
│   ├── sentiment-reporter/
│   └── ...
└── agents/
    └── main/
        └── agent          # 智能体配置

~/.config/notion/
└── api_key               # Notion API Key

/etc/systemd/user/
└── openclaw-gateway.service  # 系统服务` 
            } 
          }],
          language: 'plain text'
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ 
            text: { content: '✅ 导出完成！建议将此页面导出为 PDF 或 Markdown 备份。' } 
          }],
          icon: { emoji: '✅' },
          color: 'green_background'
        }
      }
    ]
  });
}

async function main() {
  try {
    console.log('🦞 开始导出龙虾配置到 Notion...\n');
    
    const pageId = await findOrCreateMigrationPage();
    await createTableOfContents(pageId);
    await addOpenClawConfig(pageId);
    await addCoreDocs(pageId);
    await addSkillsList(pageId);
    await addMigrationSteps(pageId);
    
    console.log('\n🎉 导出完成！');
    console.log(`🔗 页面链接: https://notion.so/${pageId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ 导出失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
