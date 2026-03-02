// Force dynamic rendering
export const dynamic = 'force-dynamic';

const MOCK_VOCAB = [
  { 日文: "測試", 讀音: "てすと", 中文: "測試", 等級: "N5", 例句: "", 例句中文: "" },
];

export async function GET(request: Request) {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  
  const url = new URL(request.url);
  const initial = url.searchParams.get('initial') === 'true';
  const size = initial ? 100 : 1000;
  
  if (!apiKey || !dbId) {
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"] });
  }

  try {
    let allResults: any[] = [];
    let cursor: string | null = null;
    let hasMore = false;
    
    // Fetch first batch
    const response = await fetch(`https://api.notion.com/v1/data_sources/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: size })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"], error: data.message });
    }
    
    allResults = [...(data.results || [])];
    hasMore = data.has_more;
    cursor = data.next_cursor;
    
    // If initial request and has more, fetch remaining in background
    if (initial && hasMore && cursor) {
      // Continue fetching
      while (cursor) {
        const nextResponse: any = await fetch(`https://api.notion.com/v1/data_sources/${dbId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2025-09-03',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page_size: 100, start_cursor: cursor })
        });
        const nextData: any = await nextResponse.json();
        allResults = [...allResults, ...(nextData.results || [])];
        cursor = nextData.next_cursor;
      }
    }

    const vocabList = allResults.map((page: any) => {
      const props = page.properties;
      return {
        日文: props["日文"]?.title?.[0]?.text?.content || "",
        讀音: props["讀音"]?.rich_text?.[0]?.text?.content || "",
        中文: props["中文"]?.rich_text?.[0]?.text?.content || "",
        等級: props["等級"]?.select?.name || "N5",
        例句: props["例句"]?.rich_text?.[0]?.text?.content || "",
        例句中文: props["例句中文"]?.rich_text?.[0]?.text?.content || "",
      };
    }).filter((v: any) => v.日文);

    const levels = Array.from(new Set(vocabList.map((v: any) => v.等級))).sort();

    return Response.json({ vocabList, levels, total: vocabList.length });
  } catch (error: any) {
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"], error: error.message });
  }
}
