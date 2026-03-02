#!/usr/bin/env node

/**
 * 檢查待處理的單字回報
 * 用法: node scripts/check-reports.js
 */

const NOTION_KEY = process.env.NOTION_API_KEY || require('fs').readFileSync(require('os').homedir() + '/.config/notion/api_key', 'utf-8').trim();

// Database IDs
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

async function checkReports() {
  console.log('📋 檢查待處理的回報...\n');
  
  // Query pending reports
  const reports = await queryNotion(REPORT_DB_ID, {
    property: '狀態',
    select: { equals: '待處理' }
  });
  
  if (reports.length === 0) {
    console.log('✅ 沒有待處理的回報');
    return;
  }
  
  console.log(`📝 找到 ${reports.length} 筆待處理回報：\n`);
  
  for (const report of reports) {
    const title = report.properties.Name?.title?.[0]?.text?.content || '無標題';
    const reportId = report.id;
    
    // Parse title: "單字 - 問題類型 說明"
    const parts = title.split(' - ');
    const vocab = parts[0]?.trim();
    const issueInfo = parts[1] || '';
    
    console.log(`──────────────`);
    console.log(`🔹 回報 ID: ${reportId}`);
    console.log(`📝 單字: ${vocab}`);
    console.log(`⚠️ 問題: ${issueInfo}`);
    
    // Try to find the word in vocab database
    try {
      const vocabResults = await queryNotion(VOCAB_DB_ID, {
        property: '日文',
        title: { equals: vocab }
      });
      
      if (vocabResults.length > 0) {
        const word = vocabResults[0];
        const kana = word.properties['讀音']?.rich_text?.[0]?.text?.content || 'N/A';
        const cn = word.properties['中文']?.rich_text?.[0]?.text?.content || 'N/A';
        const example = word.properties['例句']?.rich_text?.[0]?.text?.content || '無';
        const exampleCn = word.properties['例句中文']?.rich_text?.[0]?.text?.content || '無';
        
        console.log(`📖 目前資料:`);
        console.log(`   日文: ${vocab}`);
        console.log(`   讀音: ${kana}`);
        console.log(`   中文: ${cn}`);
        console.log(`   例句: ${example}`);
        console.log(`   例句中文: ${exampleCn}`);
      } else {
        console.log(`   ⚠️ 單字庫中找不到此單字`);
      }
    } catch (e) {
      console.log(`   ⚠️ 查詢單字庫失敗: ${e.message}`);
    }
    
    console.log();
  }
  
  console.log('──────────────');
  console.log(`\n💡 要修正請告訴我回報 ID 和正確的修正內容`);
  console.log(`   修正後我可以幫你更新 Notion 並標記為「已修正」`);
}

checkReports().catch(console.error);
