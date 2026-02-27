import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const MOCK_VOCAB = [
  { 日文: "測試", 讀音: "てすと", 中文: "測試", 等級: "N5" },
];

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  
  if (!apiKey || !dbId) {
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"] });
  }

  try {
    const allResults: any[] = [];
    let cursor: string | undefined = undefined;
    
    // Try databases.query first
    do {
      const response: any = await notion.databases.query({
        database_id: dbId,
        page_size: 100,
        start_cursor: cursor,
      });
      
      allResults.push(...response.results);
      cursor = response.next_cursor;
    } while (cursor);

    // If we no results, try got here but data_sources
    if (allResults.length === 0) {
      do {
        const response: any = await (notion as any).request({
          method: 'POST',
          path: `/v1/data_sources/${dbId}/query`,
          body: { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }
        });
        allResults.push(...response.results);
        cursor = response.next_cursor;
      } while (cursor);
    }

    // Extract vocab list and unique levels
    const vocabList = allResults.map((page: any) => {
      const props = page.properties;
      return {
        日文: props["日文"]?.title?.[0]?.text?.content || "",
        讀音: props["讀音"]?.rich_text?.[0]?.text?.content || "",
        中文: props["中文"]?.rich_text?.[0]?.text?.content || "",
        等級: props["等級"]?.select?.name || "N5",
      };
    }).filter((v: any) => v.日文);

    const levels = Array.from(new Set(vocabList.map((v: any) => v.等級))).sort();

    return Response.json({ vocabList, levels });
  } catch (error) {
    console.error("Notion API error:", error);
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5"] });
  }
}
