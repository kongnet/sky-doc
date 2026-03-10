const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

async function findSkyAiPage() {
  console.log('🔍 查找 SkyAi 页面...');
  
  const searchResponse = await notion.search({
    query: 'SkyAi',
    filter: { value: 'page', property: 'object' }
  });

  const skyAiPage = searchResponse.results.find(p => 
    !p.archived && 
    p.properties?.title?.title?.[0]?.text?.content === 'SkyAi'
  );

  if (!skyAiPage) {
    throw new Error('未找到 SkyAi 页面');
  }

  console.log('✅ 找到 SkyAi 页面:', skyAiPage.id);
  return skyAiPage.id;
}

async function createMigrationPage(parentId) {
  console.log('\n📝 在 SkyAi 下创建 "OpenCode 配置迁移" 页面...');
  
  const newPage = await notion.pages.create({
    parent: { page_id: parentId },
    properties: {
      title: { 
        title: [{ 
          text: { content: '💻 OpenCode 配置迁移' } 
        }] 
      }
    }
  });

  console.log('✅ 创建成功:', newPage.id);
  return newPage.id;
}

async function addContent(pageId) {
  const now = new Date().toLocaleString('zh-CN');
  
  // 读取 OpenCode 配置
  let opencodeConfig = '';
  try {
    opencodeConfig = fs.readFileSync('/home/sky/.openclaw/openclaw.json', 'utf8');
    // 脱敏处理
    const config = JSON.parse(opencodeConfig);
    if (config.channels?.telegram?.botToken) {
      config.channels.telegram.botToken = '***REDACTED***';
    }
    opencodeConfig = JSON.stringify(config, null, 2);
  } catch (e) {
    opencodeConfig = '无法读取配置文件';
  }

  // 读取环境变量配置
  let envContent = '';
  try {
    if (fs.existsSync('/home/sky/.openclaw/.env')) {
      envContent = fs.readFileSync('/home/sky/.openclaw/.env', 'utf8');
      // 脱敏
      envContent = envContent.replace(/(API_KEY|TOKEN|SECRET)=.+/g, '$1=***REDACTED***');
    }
  } catch (e) {
    envContent = '无环境变量文件';
  }

  console.log('\n📄 添加页面内容...');

  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ 
            text: { content: `📅 导出时间: ${now}\n🎯 OpenCode 版本: 1.2.24\n⚠️  敏感信息已脱敏` }
          }],
          icon: { emoji: '💻' }
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: '本文档包含 OpenCode 的完整配置，用于迁移到新机器。' } }]
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
          rich_text: [{ text: { content: '环境变量配置 (.env)' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '系统服务配置' } }]
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
      },
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
          rich_text: [{ text: { content: '⚠️ 注意: 敏感信息（如 API Token）已隐藏，迁移时需重新配置' } }],
          icon: { emoji: '⚠️' },
          color: 'yellow_background'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📁 ~/.openclaw/openclaw.json' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: opencodeConfig.substring(0, 1900) } }],
          language: 'json'
        }
      }
    ]
  });

  // 如果配置太长，添加剩余部分
  if (opencodeConfig.length > 1900) {
    const chunks = opencodeConfig.match(/[\s\S]{1,1900}/g) || [];
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

  // 添加环境变量配置
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
          rich_text: [{ text: { content: '2️⃣ 环境变量配置' } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📁 ~/.openclaw/.env' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: envContent || '# 无环境变量配置' } }],
          language: 'shell'
        }
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: '🔑 其他需要配置的环境变量:\n• NOTION_API_KEY (存储在 ~/.config/notion/api_key)\n• TAVILY_API_KEY\n• 其他服务的 API Keys' } }],
          icon: { emoji: '🔑' }
        }
      }
    ]
  });

  // 添加系统服务配置
  let serviceContent = '';
  try {
    serviceContent = fs.readFileSync('/home/sky/.config/systemd/user/openclaw-gateway.service', 'utf8');
  } catch (e) {
    serviceContent = '无法读取服务文件';
  }

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
          rich_text: [{ text: { content: '3️⃣ 系统服务配置' } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📁 ~/.config/systemd/user/openclaw-gateway.service' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: serviceContent } }],
          language: 'plain text'
        }
      }
    ]
  });

  // 添加迁移步骤
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
          rich_text: [{ text: { content: '按顺序执行以下步骤完成 OpenCode 迁移' } }],
          icon: { emoji: '📌' },
          color: 'blue_background'
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '安装 OpenCode: pnpm add -g opencode-ai@latest' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '创建配置目录: mkdir -p ~/.openclaw' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '复制 openclaw.json 配置文件' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '配置环境变量: 创建 ~/.openclaw/.env' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '配置 Notion API Key: mkdir -p ~/.config/notion && echo "KEY" > api_key' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '复制系统服务: mkdir -p ~/.config/systemd/user/ && 复制服务文件' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '启用服务: systemctl --user daemon-reload && systemctl --user enable openclaw-gateway' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '启动服务: systemctl --user start openclaw-gateway' } }]
        }
      },
      {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ text: { content: '验证: opencode --version && 访问 http://localhost:18789' } }]
        }
      }
    ]
  });

  // 添加重要目录结构
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
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📁 重要目录结构' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ text: { content: `~/.openclaw/
├── openclaw.json          # 主配置文件
├── .env                   # 环境变量
├── workspace/             # 工作空间
│   ├── AGENTS.md
│   ├── SOUL.md
│   ├── TOOLS.md
│   └── ...
└── skills/                # 技能目录
    ├── server-operator/
    ├── sentiment-analyzer/
    └── ...

~/.config/notion/
└── api_key               # Notion API Key

~/.config/systemd/user/
└── openclaw-gateway.service  # 系统服务

~/.local/share/pnpm/global/5/
└── ...                   # 全局安装包` } }],
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
          rich_text: [{ text: { content: '✅ 导出完成！建议将此页面导出为 PDF 或 Markdown 备份。' } }],
          icon: { emoji: '✅' },
          color: 'green_background'
        }
      }
    ]
  });

  console.log('✅ 内容添加完成');
}

async function main() {
  try {
    console.log('💻 开始导出 OpenCode 配置迁移文档...\n');
    
    const skyAiId = await findSkyAiPage();
    const pageId = await createMigrationPage(skyAiId);
    await addContent(pageId);
    
    console.log('\n🎉 导出完成！');
    console.log(`🔗 页面链接: https://notion.so/${pageId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ 导出失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
