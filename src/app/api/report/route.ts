import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Database IDs - use data_sources endpoint format
const REPORT_DB_ID = process.env.NOTION_REPORT_DB_ID || "eeab3d11-9721-48a1-b17e-040f4e468d07";

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

    // Use data_sources endpoint
    await (notion as any).request({
      method: 'POST',
      path: '/v1/pages',
      body: {
        parent: { database_id: REPORT_DB_ID },
        properties: {
          "Name": {
            title: [{ text: { content } }]
          },
          "狀態": {
            select: { name: "待處理" }
          }
        }
      }
    });

    return Response.json({ success: true, message: "回報已送出！" });
  } catch (error) {
    console.error("Report error:", error);
    return Response.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
