const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

async function cleanupEmptyPages() {
  try {
    console.log('🔍 搜索 "🦞定时任务" 相关页面...\n');
    
    const searchResponse = await notion.search({
      query: '🦞定时任务',
      filter: { value: 'page', property: 'object' }
    });

    console.log(`找到 ${searchResponse.results.length} 个页面:\n`);
    
    const pages = searchResponse.results;
    const pagesToDelete = [];
    const pagesToKeep = [];

    for (const page of pages) {
      const pageId = page.id;
      const title = page.properties?.title?.title?.[0]?.text?.content || '无标题';
      
      // 获取页面内容
      const blocks = await notion.blocks.children.list({ 
        block_id: pageId,
        page_size: 10
      });
      
      const hasContent = blocks.results.length > 0;
      const hasTable = blocks.results.some(block => block.type === 'table');
      
      console.log(`📄 ${title}`);
      console.log(`   ID: ${pageId}`);
      console.log(`   内容块数: ${blocks.results.length}`);
      console.log(`   有表格: ${hasTable ? '✅' : '❌'}`);
      
      if (!hasTable && blocks.results.length <= 2) {
        console.log(`   ⚠️  标记为: 空页面 (可删除)`);
        pagesToDelete.push({ id: pageId, title });
      } else {
        console.log(`   ✅ 标记为: 保留`);
        pagesToKeep.push({ id: pageId, title });
      }
      console.log('');
    }

    console.log(`\n📊 总结:`);
    console.log(`   可删除: ${pagesToDelete.length} 个`);
    console.log(`   需保留: ${pagesToKeep.length} 个\n`);

    if (pagesToDelete.length === 0) {
      console.log('✅ 没有空页面需要清理');
      return;
    }

    // 删除空页面
    console.log('🗑️  开始删除空页面...\n');
    for (const page of pagesToDelete) {
      try {
        await notion.pages.update({
          page_id: page.id,
          archived: true
        });
        console.log(`   ✅ 已删除: ${page.title}`);
      } catch (err) {
        console.log(`   ❌ 删除失败 ${page.title}: ${err.message}`);
      }
    }

    console.log('\n🎉 清理完成！');
    console.log('\n保留的页面:');
    pagesToKeep.forEach(p => console.log(`   ✅ ${p.title} (${p.id})`));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

cleanupEmptyPages();
