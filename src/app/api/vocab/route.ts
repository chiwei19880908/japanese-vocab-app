import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const MOCK_VOCAB = [
  { 日文: "測試", 讀音: "てすと", 中文: "測試", 等級: "N5", 例句: "", 例句中文: "" },
];

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  
  if (!apiKey || !dbId) {
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"] });
  }

  try {
    const allResults: any[] = [];
    let cursor: string | null = null;
    
    // Use fetch with data_sources endpoint
    do {
      const body: any = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      
      const response = await fetch(`https://api.notion.com/v1/data_sources/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Notion API error:', data.message);
        return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"] });
      }
      
      if (data.results) {
        allResults.push(...data.results);
      }
      cursor = data.next_cursor;
    } while (cursor);

    // Extract vocab list and unique levels
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

    return Response.json({ vocabList, levels });
  } catch (error) {
    console.error("Notion API error:", error);
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"] });
  }
}
