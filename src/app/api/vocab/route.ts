import { Client } from "@notionhq/client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const MOCK_VOCAB = [
  { 日文: "測試", 讀音: "てすと", 中文: "測試", 等級: "N5", 例句: "", 例句中文: "" },
];

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  
  if (!apiKey || !dbId) {
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"], error: "Missing env vars" });
  }

  try {
    // Use notion.databases.query through SDK
    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
    });
    
    let allResults = [...response.results];
    let nextCursor = response.next_cursor;
    
    // Get more pages if available
    while (nextCursor) {
      const nextPage: any = await notion.databases.query({
        database_id: dbId,
        page_size: 100,
        start_cursor: nextCursor,
      });
      allResults = [...allResults, ...nextPage.results];
      nextCursor = nextPage.next_cursor;
    }

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
  } catch (error: any) {
    console.error("Notion API error:", error.message);
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"], error: error.message });
  }
}
