import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Database ID: 單字回報
const REPORT_DB_ID = process.env.NOTION_REPORT_DB_ID || "2406aa0650fb4802ae87a5eff0868271";

export async function POST(request: Request) {
  const apiKey = process.env.NOTION_API_KEY;
  
  if (!apiKey) {
    return Response.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { vocab, issueType, description } = body;

    if (!vocab) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build content string
    const content = `${vocab} - ${issueType || ""} ${description || ""}`;

    await notion.pages.create({
      parent: { database_id: REPORT_DB_ID },
      properties: {
        "Name": {
          title: [{ text: { content } }]
        }
      }
    });

    return Response.json({ success: true, message: "回報已送出！" });
  } catch (error) {
    console.error("Report error:", error);
    return Response.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
