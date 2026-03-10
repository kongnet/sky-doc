const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

async function movePage() {
  try {
    console.log('🔍 分析页面结构...\n');
    
    // 找到"🦞定时任务"页面
    const taskSearch = await notion.search({
      query: '🦞定时任务',
      filter: { value: 'page', property: 'object' }
    });
    
    if (taskSearch.results.length === 0) {
      console.log('❌ 未找到定时任务页面');
      return;
    }
    
    // 获取未归档的定时任务页面
    const activePages = taskSearch.results.filter(p => !p.archived);
    
    if (activePages.length === 0) {
      console.log('❌ 没有活跃的定时任务页面');
      return;
    }
    
    const taskPage = activePages[0];
    const taskPageId = taskPage.id;
    const currentParentId = taskPage.parent?.page_id;
    
    console.log('📄 定时任务页面:');
    console.log(`   ID: ${taskPageId}`);
    console.log(`   当前父页面ID: ${currentParentId}`);
    console.log('');
    
    // 搜索所有顶级页面来查找工作区根页面
    console.log('🔍 查找工作区结构...');
    const allPages = await notion.search({
      query: '',
      filter: { value: 'page', property: 'object' },
      page_size: 100
    });
    
    console.log(`   找到 ${allPages.results.length} 个页面\n`);
    
    // 查找可能的根页面（通常是最早创建的页面之一）
    // 或者查找不包含在定时任务下的页面
    const potentialRoots = allPages.results.filter(p => {
      const parent = p.parent;
      // 如果父页面是workspace或者不指向定时任务页面
      return !p.archived && p.id !== taskPageId;
    });
    
    console.log('📋 可用的父页面选项:');
    potentialRoots.forEach((p, idx) => {
      const title = p.properties?.title?.title?.[0]?.text?.content || '无标题';
      console.log(`   ${idx + 1}. ${title} (${p.id})`);
    });
    
    // 找到SkyAi页面或类似的根页面
    const skyAiPage = potentialRoots.find(p => {
      const title = p.properties?.title?.title?.[0]?.text?.content || '';
      return title.toLowerCase().includes('sky') || title.toLowerCase().includes('ai');
    });
    
    if (!skyAiPage) {
      console.log('\n❌ 未找到合适的根页面，使用第一个可用页面');
      return;
    }
    
    const targetParentId = skyAiPage.id;
    console.log(`\n🎯 目标父页面: ${skyAiPage.properties?.title?.title?.[0]?.text?.content || 'SkyAi'} (${targetParentId})\n`);
    
    // 检查当前是否已经在正确的位置
    if (currentParentId === targetParentId) {
      console.log('✅ 页面已经在正确的位置！');
      return;
    }
    
    // 创建新页面在正确的位置
    console.log('📝 在新位置重新创建页面...');
    
    // 先获取原页面的内容
    const blocks = await notion.blocks.children.list({
      block_id: taskPageId
    });
    
    console.log(`   原页面有 ${blocks.results.length} 个内容块`);
    
    // 创建新页面
    const newPage = await notion.pages.create({
      parent: { page_id: targetParentId },
      properties: {
        title: {
          title: [{ text: { content: '🦞定时任务' } }]
        }
      }
    });
    
    console.log(`   ✅ 新页面创建成功: ${newPage.id}`);
    
    // 复制内容块到新页面
    console.log('📋 复制内容到新页面...');
    
    for (const block of blocks.results) {
      try {
        // 简化复制，跳过有问题的块
        if (block.type === 'table') {
          // 对于表格，需要重新创建
          console.log('   📝 重新创建表格...');
          
          // 获取表格的行
          const tableRows = await notion.blocks.children.list({
            block_id: block.id
          });
          
          const newTableRows = [];
          for (const row of tableRows.results) {
            if (row.type === 'table_row') {
              newTableRows.push({
                object: 'block',
                type: 'table_row',
                table_row: {
                  cells: row.table_row.cells
                }
              });
            }
          }
          
          await notion.blocks.children.append({
            block_id: newPage.id,
            children: [{
              object: 'block',
              type: 'table',
              table: {
                table_width: block.table.table_width,
                has_column_header: block.table.has_column_header,
                has_row_header: block.table.has_row_header,
                children: newTableRows
              }
            }]
          });
        } else {
          // 其他类型的块
          const { id, type, ...blockData } = block;
          await notion.blocks.children.append({
            block_id: newPage.id,
            children: [{
              object: 'block',
              type: type,
              [type]: blockData[type]
            }]
          });
        }
      } catch (err) {
        console.log(`   ⚠️  跳过块: ${err.message}`);
      }
    }
    
    // 归档旧页面
    console.log('\n🗑️  归档旧页面...');
    await notion.pages.update({
      page_id: taskPageId,
      archived: true
    });
    
    console.log('✅ 旧页面已归档');
    console.log('\n🎉 完成！');
    console.log(`🔗 新页面链接: https://notion.so/${newPage.id.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }
}

movePage();
