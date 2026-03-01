import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const REPORT_DB_ID = process.env.REPORT_DB_ID || "eeab3d11-9721-48a1-b17e-040f4e468d07";

export async function POST(request: Request) {
  const apiKey = process.env.NOTION_API_KEY;
  
  if (!apiKey) {
    return Response.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { vocab, issueType, description } = body;

    if (!vocab || !issueType) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create a new page in the report database
    await notion.pages.create({
      parent: { database_id: REPORT_DB_ID },
      properties: {
        "單字": {
          title: [{ text: { content: vocab } }]
        },
        "問題": {
          select: { name: issueType }
        },
        "說明": {
          rich_text: [{ text: { content: description || "" } }]
        },
        "狀態": {
          select: { name: "待處理" }
        }
      }
    });

    return Response.json({ success: true, message: "回報已送出！" });
  } catch (error) {
    console.error("Report error:", error);
    return Response.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
