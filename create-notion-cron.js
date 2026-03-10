const { Client } = require('@notionhq/client');
const fs = require('fs');

// 初始化 Notion 客户端
const notion = new Client({
  auth: fs.readFileSync('/home/sky/.config/notion/api_key', 'utf8').trim()
});

// 定时任务数据
const cronJobs = [
  {
    name: 'eSIM价格报告',
    schedule: '每周一 03:00',
    frequency: '每周',
    command: '/home/sky/tools/sky-claw/tool/run-esim-report.sh',
    description: '生成eSIM价格对比报告，推送到GitHub Pages',
    status: '活跃',
    output: 'esim-price-comparison.html'
  },
  {
    name: 'RSS新闻抓取',
    schedule: '每6小时',
    frequency: '每6小时',
    command: 'rss-fetcher.js',
    description: '从211个RSS源抓取新闻，保存到MySQL并生成HTML',
    status: '活跃',
    output: 'rss-view.html'
  },
  {
    name: '全球市值排行',
    schedule: '每天 12:00',
    frequency: '每天',
    command: '/home/sky/tools/sky-claw/tool/run-marketcap-cron.sh',
    description: '获取纳斯达克、加密货币、港股、A股市值排行',
    status: '活跃',
    output: 'marketcap-ranking.html'
  },
  {
    name: '情感分析报告',
    schedule: '按需/手动',
    frequency: '按需',
    command: 'sentiment-echarts-ai.js',
    description: '分析RSS新闻情感倾向，生成可视化报告',
    status: '活跃',
    output: 'sentiment-ai-*.html'
  },
  {
    name: '服务器操作技能',
    schedule: '按需',
    frequency: '按需',
    command: 'server-operator/handler.js',
    description: 'SSH服务器管理和命令执行技能',
    status: '活跃',
    output: 'SSH会话'
  }
];

async function findOrCreatePage() {
  try {
    console.log('🔍 搜索 "🦞定时任务" 页面...');
    const searchResponse = await notion.search({
      query: '🦞定时任务',
      filter: {
        value: 'page',
        property: 'object'
      }
    });

    if (searchResponse.results.length > 0) {
      console.log('✅ 找到现有页面:', searchResponse.results[0].id);
      return searchResponse.results[0].id;
    }

    console.log('📝 创建新的 "🦞定时任务" 页面...');
    
    const parentSearch = await notion.search({
      query: '',
      filter: {
        value: 'page',
        property: 'object'
      },
      page_size: 1
    });

    if (parentSearch.results.length === 0) {
      throw new Error('未找到可用的父页面');
    }

    const parentPageId = parentSearch.results[0].id;
    
    const newPage = await notion.pages.create({
      parent: {
        page_id: parentPageId
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: '🦞定时任务'
              }
            }
          ]
        }
      }
    });

    console.log('✅ 创建页面成功:', newPage.id);
    return newPage.id;
  } catch (error) {
    console.error('❌ 查找/创建页面失败:', error.message);
    throw error;
  }
}

async function createDatabase(parentPageId) {
  try {
    console.log('📊 创建数据库表格...');
    
    // 使用正确的 properties 格式（英文属性名）
    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: '📋 定时任务列表'
          }
        }
      ],
      properties: {
        'Name': {
          title: {}
        },
        'Schedule': {
          rich_text: {}
        },
        'Frequency': {
          select: {
            options: [
              { name: '每6小时', color: 'blue' },
              { name: '每天', color: 'green' },
              { name: '每周', color: 'purple' },
              { name: '按需', color: 'gray' }
            ]
          }
        },
        'Command': {
          rich_text: {}
        },
        'Description': {
          rich_text: {}
        },
        'Status': {
          select: {
            options: [
              { name: '活跃', color: 'green' },
              { name: '暂停', color: 'yellow' },
              { name: '错误', color: 'red' }
            ]
          }
        },
        'Output': {
          rich_text: {}
        }
      }
    });

    console.log('✅ 数据库创建成功:', database.id);
    return database.id;
  } catch (error) {
    console.error('❌ 创建数据库失败:', error.message);
    throw error;
  }
}

async function addEntries(databaseId) {
  try {
    console.log('📝 添加定时任务条目...');
    
    for (const job of cronJobs) {
      await notion.pages.create({
        parent: {
          database_id: databaseId
        },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: job.name
                }
              }
            ]
          },
          'Schedule': {
            rich_text: [
              {
                text: {
                  content: job.schedule
                }
              }
            ]
          },
          'Frequency': {
            select: {
              name: job.frequency
            }
          },
          'Command': {
            rich_text: [
              {
                text: {
                  content: job.command
                }
              }
            ]
          },
          'Description': {
            rich_text: [
              {
                text: {
                  content: job.description
                }
              }
            ]
          },
          'Status': {
            select: {
              name: job.status
            }
          },
          'Output': {
            rich_text: [
              {
                text: {
                  content: job.output
                }
              }
            ]
          }
        }
      });
      
      console.log(`  ✅ 添加: ${job.name}`);
    }

    console.log(`✅ 成功添加 ${cronJobs.length} 个任务`);
  } catch (error) {
    console.error('❌ 添加条目失败:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🦞 开始创建 Notion 定时任务表格...\n');
    
    const pageId = await findOrCreatePage();
    const databaseId = await createDatabase(pageId);
    await addEntries(databaseId);
    
    console.log('\n🎉 完成！');
    console.log(`🔗 页面链接: https://notion.so/${pageId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

main();
