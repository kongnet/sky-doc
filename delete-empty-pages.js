const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

// 要删除的空页面ID
const emptyPageIds = [
  '31e5e9e5-b94c-81ad-9f7e-ece1a6d50e06',  // 0个内容块
  '31e5e9e5-b94c-81fd-a589-fc911289ee3c',  // 1个内容块
  '31e5e9e5-b94c-8176-8edb-ccf05c3ccf7d'   // 1个内容块
];

// 保留的有效页面ID
const keepPageId = '31e5e9e5-b94c-8121-a5a7-dd9580a5904f';

async function deleteEmptyPages() {
  console.log('🗑️  开始清理空页面...\n');
  
  for (const pageId of emptyPageIds) {
    try {
      await notion.pages.update({
        page_id: pageId,
        archived: true
      });
      console.log(`✅ 已归档: ${pageId}`);
    } catch (err) {
      console.log(`❌ 失败 ${pageId}: ${err.message}`);
    }
  }
  
  console.log('\n📌 保留的有效页面:');
  console.log(`   ✅ ${keepPageId}`);
  console.log(`   🔗 https://notion.so/${keepPageId.replace(/-/g, '')}`);
  
  console.log('\n🎉 清理完成！');
}

deleteEmptyPages();
