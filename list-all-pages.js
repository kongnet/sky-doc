const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

async function listPages() {
  try {
    console.log('🔍 搜索所有页面...\n');
    
    const searchResponse = await notion.search({
      query: '',
      filter: { value: 'page', property: 'object' },
      page_size: 100
    });

    console.log(`找到 ${searchResponse.results.length} 个页面:\n`);
    
    for (const page of searchResponse.results) {
      const pageId = page.id;
      const title = page.properties?.title?.title?.[0]?.text?.content || 
                   page.properties?.Name?.title?.[0]?.text?.content || 
                   '无标题';
      
      // 获取页面内容数量
      try {
        const blocks = await notion.blocks.children.list({ 
          block_id: pageId,
          page_size: 1
        });
        
        const isArchived = page.archived ? ' (已归档)' : '';
        console.log(`📄 ${title}${isArchived}`);
        console.log(`   ID: ${pageId}`);
        console.log(`   URL: https://notion.so/${pageId.replace(/-/g, '')}`);
        console.log('');
      } catch (e) {
        console.log(`📄 ${title} (无法读取)`);
        console.log(`   ID: ${pageId}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

listPages();
