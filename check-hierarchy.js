const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

async function checkHierarchy() {
  try {
    console.log('🔍 分析Notion页面结构...\n');
    
    // 搜索所有页面
    const allPages = await notion.search({
      query: '',
      filter: { value: 'page', property: 'object' },
      page_size: 100
    });
    
    console.log(`找到 ${allPages.results.length} 个页面:\n`);
    
    // 过滤出未归档的页面
    const activePages = allPages.results.filter(p => !p.archived);
    
    console.log('📋 页面层级结构:\n');
    
    for (const page of activePages) {
      const pageId = page.id;
      const title = page.properties?.title?.title?.[0]?.text?.content || '无标题';
      const parent = page.parent;
      
      console.log(`📄 ${title}`);
      console.log(`   ID: ${pageId}`);
      console.log(`   父页面类型: ${parent?.type || 'unknown'}`);
      
      if (parent?.type === 'page_id') {
        // 查找父页面标题
        const parentPage = activePages.find(p => p.id === parent.page_id);
        const parentTitle = parentPage?.properties?.title?.title?.[0]?.text?.content || parent.page_id;
        console.log(`   父页面: ${parentTitle}`);
      } else if (parent?.type === 'workspace') {
        console.log(`   父页面: 工作区根 (Workspace)`);
      }
      
      // 检查是否是工作区根页面
      const isWorkspaceRoot = parent?.type === 'workspace' || !parent?.page_id;
      console.log(`   工作区根: ${isWorkspaceRoot ? '✅ 是' : '❌ 否'}`);
      console.log('');
    }
    
    // 找到API Key和定时任务页面
    const apiKeyPage = activePages.find(p => {
      const title = p.properties?.title?.title?.[0]?.text?.content || '';
      return title.toLowerCase().includes('api');
    });
    
    const cronPage = activePages.find(p => {
      const title = p.properties?.title?.title?.[0]?.text?.content || '';
      return title.includes('定时任务') || title.includes('🦞');
    });
    
    console.log('📊 关键页面分析:\n');
    
    if (apiKeyPage) {
      const title = apiKeyPage.properties?.title?.title?.[0]?.text?.content;
      console.log(`🔑 API Key页面: ${title}`);
      console.log(`   ID: ${apiKeyPage.id}`);
      console.log(`   父类型: ${apiKeyPage.parent?.type}`);
      console.log(`   是否工作区根: ${apiKeyPage.parent?.type === 'workspace' ? '✅ 是' : '❌ 否'}`);
      console.log('');
    }
    
    if (cronPage) {
      const title = cronPage.properties?.title?.title?.[0]?.text?.content;
      console.log(`🦞 定时任务页面: ${title}`);
      console.log(`   ID: ${cronPage.id}`);
      console.log(`   父类型: ${cronPage.parent?.type}`);
      console.log(`   是否工作区根: ${cronPage.parent?.type === 'workspace' ? '✅ 是' : '❌ 否'}`);
      
      if (cronPage.parent?.type === 'page_id') {
        const parentPage = activePages.find(p => p.id === cronPage.parent.page_id);
        console.log(`   当前父页面: ${parentPage?.properties?.title?.title?.[0]?.text?.content || cronPage.parent.page_id}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

checkHierarchy();
