import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const MOCK_VOCAB = [
  { 日文: "家族", 讀音: "かぞく", 中文: "家人", 等級: "N5" },
  { 日文: "両親", 讀音: "りょうしん", 中文: "父母", 等級: "N5" },
  { 日文: "先生", 讀音: "せんせい", 中文: "老師", 等級: "N5" },
];

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  
  if (!apiKey || !dbId) {
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5", "N4"] });
  }

  try {
    // Get first batch
    const response1 = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
    });
    
    let allResults = [...response1.results];
    let nextCursor = response1.next_cursor;
    
    // Get second batch if exists
    if (nextCursor) {
      const response2 = await notion.databases.query({
        database_id: dbId,
        page_size: 100,
        start_cursor: nextCursor,
      });
      allResults = [...allResults, ...response2.results];
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

    // Get unique levels
    const levels = Array.from(new Set(vocabList.map((v: any) => v.等級))).sort();

    return Response.json({ vocabList, levels });
  } catch (error) {
    console.error("Notion API error:", error);
    return Response.json({ vocabList: MOCK_VOCAB, levels: ["N5", "N4"] });
  }
}
