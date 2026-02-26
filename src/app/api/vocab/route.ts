import { Client } from "@notionhq/client";
import { NotionAPI } from 'notion-client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// 假資料（如果沒有 API key）
const MOCK_VOCAB = [
  { 日文: "家族", 讀音: "かぞく", 中文: "家人", 等級: "N5" },
  { 日文: "両親", 讀音: "りょうしん", 中文: "父母", 等級: "N5" },
  { 日文: "先生", 讀音: "せんせい", 中文: "老師", 等級: "N5" },
  { 日文: "学生", 讀音: "がくせい", 中文: "學生", 等級: "N5" },
  { 日文: "食べ物", 讀音: "たべもの", 中文: "食物", 等級: "N5" },
  { 日文: "水", 讀音: "みず", 中文: "水", 等級: "N5" },
  { 日文: "お茶", 讀音: "おちゃ", 中文: "茶", 等級: "N5" },
  { 日文: "頭", 讀音: "あたま", 中文: "頭", 等級: "N5" },
  { 日文: "目", 讀音: "め", 中文: "眼睛", 等級: "N5" },
  { 日文: "手", 讀音: "て", 中文: "手", 等級: "N5" },
];

export async function getVocabList() {
  const apiKey = process.env.NOTION_API_KEY;
  
  if (!apiKey) {
    console.log("No API key, using mock data");
    return MOCK_VOCAB;
  }

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID || "312d9ae3-60fb-8164-a254-000b45114929",
      page_size: 100,
    });

    const vocabList = response.results.map((page: any) => {
      const props = page.properties;
      return {
        日文: props["日文"]?.title?.[0]?.text?.content || "",
        讀音: props["讀音"]?.rich_text?.[0]?.text?.content || "",
        中文: props["中文"]?.rich_text?.[0]?.text?.content || "",
        等級: props["等級"]?.select?.name || "N5",
      };
    });

    return vocabList.filter((v: any) => v.日文);
  } catch (error) {
    console.error("Notion API error:", error);
    return MOCK_VOCAB;
  }
}

export default async function handler(req: Request) {
  const vocabList = await getVocabList();
  return Response.json({ vocabList });
}
