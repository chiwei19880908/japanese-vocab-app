#!/usr/bin/env node
// Simple report checker - outputs markdown for agent to read

const NOTION_KEY = process.env.NOTION_API_KEY || require('fs').readFileSync(require('os').homedir() + '/.config/notion/api_key', 'utf-8').trim();

const REPORT_DB_ID = 'eeab3d11-9721-48a1-b17e-040f4e468d07';
const VOCAB_DB_ID = '312d9ae3-60fb-8164-a254-000b45114929';

async function queryNotion(dbId, filter = null) {
  const url = `https://api.notion.com/v1/data_sources/${dbId}/query`;
  const body = filter ? { filter, page_size: 50 } : { page_size: 50 };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_KEY}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  return data.results || [];
}

async function main() {
  const reports = await queryNotion(REPORT_DB_ID, {
    property: '狀態',
    select: { equals: '待處理' }
  });
  
  if (reports.length === 0) {
    console.log('✅ 沒有待處理的單字回報');
    return;
  }
  
  console.log(`⚠️ 有 ${reports.length} 筆待處理的單字回報：\n`);
  
  for (const report of reports) {
    const title = report.properties.Name?.title?.[0]?.text?.content || '無標題';
    console.log(`📝 ${title}`);
    console.log(`   ID: ${report.id}\n`);
  }
}

main().catch(e => console.error('Error:', e.message));
