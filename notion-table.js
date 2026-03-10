const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

const cronJobs = [
  {
    name: 'eSIM价格报告',
    schedule: '每周一 03:00',
    frequency: '每周',
    command: 'run-esim-report.sh',
    description: '生成eSIM价格对比报告',
    status: '✅ 活跃',
    output: 'esim-price-comparison.html'
  },
  {
    name: 'RSS新闻抓取',
    schedule: '每6小时',
    frequency: '每6小时',
    command: 'rss-fetcher.js',
    description: '从211个RSS源抓取新闻',
    status: '✅ 活跃',
    output: 'rss-view.html'
  },
  {
    name: '全球市值排行',
    schedule: '每天 12:00',
    frequency: '每天',
    command: 'run-marketcap-cron.sh',
    description: '获取全球市值排行',
    status: '✅ 活跃',
    output: 'marketcap-ranking.html'
  },
  {
    name: '情感分析报告',
    schedule: '按需',
    frequency: '按需',
    command: 'sentiment-echarts-ai.js',
    description: '分析RSS新闻情感倾向',
    status: '✅ 活跃',
    output: 'sentiment-ai-*.html'
  },
  {
    name: '服务器操作技能',
    schedule: '按需',
    frequency: '按需',
    command: 'server-operator',
    description: 'SSH服务器管理',
    status: '✅ 活跃',
    output: 'SSH会话'
  }
];

async function createTablePage() {
  try {
    console.log('🔍 搜索父页面...');
    const parentSearch = await notion.search({
      query: '',
      filter: { value: 'page', property: 'object' },
      page_size: 1
    });

    if (parentSearch.results.length === 0) {
      throw new Error('未找到父页面');
    }

    const parentId = parentSearch.results[0].id;
    console.log('✅ 找到父页面:', parentId);

    // 创建页面
    console.log('📝 创建 "🦞定时任务" 页面...');
    const page = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ text: { content: '🦞定时任务' } }]
        }
      }
    });

    console.log('✅ 页面创建成功:', page.id);

    // 添加标题和说明
    console.log('📝 添加页面内容...');
    await notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { text: { content: '📅 ' } },
              { text: { content: '最后更新: ' + new Date().toLocaleString('zh-CN') } }
            ]
          }
        },
        {
          object: 'block',
          type: 'divider',
          divider: {}
        }
      ]
    });

    // 创建表格
    console.log('📊 创建表格...');
    
    // 表头
    const tableHeader = {
      object: 'block',
      type: 'table_row',
      table_row: {
        cells: [
          [{ text: { content: '任务名称' } }],
          [{ text: { content: '执行时间' } }],
          [{ text: { content: '频率' } }],
          [{ text: { content: '命令' } }],
          [{ text: { content: '功能描述' } }],
          [{ text: { content: '状态' } }],
          [{ text: { content: '输出' } }]
        ]
      }
    };

    // 数据行
    const tableRows = cronJobs.map(job => ({
      object: 'block',
      type: 'table_row',
      table_row: {
        cells: [
          [{ text: { content: job.name } }],
          [{ text: { content: job.schedule } }],
          [{ text: { content: job.frequency } }],
          [{ text: { content: job.command } }],
          [{ text: { content: job.description } }],
          [{ text: { content: job.status } }],
          [{ text: { content: job.output } }]
        ]
      }
    }));

    // 创建表格块
    await notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          object: 'block',
          type: 'table',
          table: {
            table_width: 7,
            has_column_header: true,
            has_row_header: false,
            children: [tableHeader, ...tableRows]
          }
        }
      ]
    });

    console.log('✅ 表格创建成功！');
    console.log(`🔗 页面链接: https://notion.so/${page.id.replace(/-/g, '')}`);

    return page.id;
  } catch (error) {
    console.error('❌ 错误:', error.message);
    throw error;
  }
}

createTablePage();
