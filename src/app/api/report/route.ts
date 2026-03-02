// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Database IDs
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

    // Use fetch directly
    const response = await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: REPORT_DB_ID },
        properties: {
          "Name": {
            title: [{ text: { content } }]
          },
          "狀態": {
            select: { name: "待處理" }
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, message: "回報已送出！" });
  } catch (error) {
    console.error("Report error:", error);
    return Response.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
