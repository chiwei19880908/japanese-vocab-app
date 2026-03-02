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
    let cursor: string | undefined = undefined;
    
    // Use raw request to data_sources endpoint (works for connected databases)
    do {
      const response: any = await (notion as any).request({
        method: 'POST',
        path: `/v1/data_sources/${dbId}/query`,
        body: {
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {})
        }
      });
      
      allResults.push(...response.results);
      cursor = response.next_cursor;
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
