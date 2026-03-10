const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

async function fixHierarchy() {
  try {
    console.log('🔧 修复页面层级...\n');
    
    // 获取API Key页面
    const apiKeySearch = await notion.search({
      query: 'API Key',
      filter: { value: 'page', property: 'object' }
    });
    
    const apiKeyPage = apiKeySearch.results.find(p => !p.archived);
    
    if (!apiKeyPage) {
      console.log('❌ 未找到API Key页面');
      return;
    }
    
    // 获取定时任务页面
    const cronSearch = await notion.search({
      query: '🦞定时任务',
      filter: { value: 'page', property: 'object' }
    });
    
    const cronPage = cronSearch.results.find(p => !p.archived);
    
    if (!cronPage) {
      console.log('❌ 未找到定时任务页面');
      return;
    }
    
    console.log('📋 当前结构:');
    console.log(`   SkyAi`);
    console.log(`   └── 🦞定时任务 (${cronPage.id})`);
    console.log(`       └── 🔑 API Key 配置清单 (${apiKeyPage.id}) ← 需要移动`);
    console.log('');
    
    // 获取定时任务的父页面（SkyAi）
    const skyAiId = cronPage.parent?.page_id;
    
    if (!skyAiId) {
      console.log('❌ 无法获取SkyAi页面ID');
      return;
    }
    
    console.log(`🎯 目标: 将API Key移动到SkyAi下，与定时任务平级\n`);
    
    // 获取API Key页面内容
    console.log('📋 备份API Key页面内容...');
    const blocks = await notion.blocks.children.list({
      block_id: apiKeyPage.id
    });
    console.log(`   找到 ${blocks.results.length} 个内容块\n`);
    
    // 创建新的API Key页面在SkyAi下
    console.log('📝 在SkyAi下创建新的API Key页面...');
    const newApiKeyPage = await notion.pages.create({
      parent: { page_id: skyAiId },
      properties: {
        title: {
          title: [{ text: { content: '🔑 API Key 配置清单' } }]
        }
      }
    });
    console.log(`   ✅ 新页面创建成功: ${newApiKeyPage.id}\n`);
    
    // 复制内容
    if (blocks.results.length > 0) {
      console.log('📋 复制内容到新页面...');
      for (const block of blocks.results) {
        try {
          const { id, type, ...blockData } = block;
          await notion.blocks.children.append({
            block_id: newApiKeyPage.id,
            children: [{
              object: 'block',
              type: type,
              [type]: blockData[type]
            }]
          });
        } catch (err) {
          console.log(`   ⚠️  跳过块: ${err.message}`);
        }
      }
      console.log('   ✅ 内容复制完成\n');
    }
    
    // 归档旧的API Key页面
    console.log('🗑️  归档旧的API Key页面...');
    await notion.pages.update({
      page_id: apiKeyPage.id,
      archived: true
    });
    console.log('   ✅ 旧页面已归档\n');
    
    console.log('🎉 完成！新的层级结构:');
    console.log(`   SkyAi`);
    console.log(`   ├── 🦞定时任务 (${cronPage.id})`);
    console.log(`   └── 🔑 API Key 配置清单 (${newApiKeyPage.id}) ← 已平级`);
    console.log('');
    console.log(`🔗 定时任务: https://notion.so/${cronPage.id.replace(/-/g, '')}`);
    console.log(`🔗 API Key: https://notion.so/${newApiKeyPage.id.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  }
}

fixHierarchy();
