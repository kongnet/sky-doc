const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

// 之前创建的页面ID列表
const pageIds = [
  '31e5e9e5-b94c-81ad-9f7e-ece1a6d50e06',
  '31e5e9e5-b94c-81fd-a589-fc911289ee3c', 
  '31e5e9e5-b94c-8176-8edb-ccf05c3ccf7d',
  '31e5e9e5-b94c-8121-a5a7-dd9580a5904f'
];

async function checkPages() {
  console.log('🔍 检查已知的页面...\n');
  
  for (const pageId of pageIds) {
    try {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const title = page.properties?.title?.title?.[0]?.text?.content || '无标题';
      const isArchived = page.archived;
      
      console.log(`📄 ${title}`);
      console.log(`   ID: ${pageId}`);
      console.log(`   已归档: ${isArchived ? '✅ 是' : '❌ 否'}`);
      
      if (!isArchived) {
        // 检查内容
        const blocks = await notion.blocks.children.list({ 
          block_id: pageId 
        });
        console.log(`   内容块数: ${blocks.results.length}`);
        
        if (blocks.results.length <= 2) {
          console.log(`   ⚠️  可能是空页面`);
        }
      }
      console.log('');
    } catch (err) {
      console.log(`❌ ${pageId}: ${err.message}\n`);
    }
  }
}

checkPages();
