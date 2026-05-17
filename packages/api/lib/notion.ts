// Notion Integration for AsiliChain
// Stores crew outputs, tracks human reviews, manages project docs

import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.GOOSE_NOTION_TOKEN,
});

// Database IDs (configure after creating in Notion)
export const DATABASES = {
  CREW_OUTPUTS: process.env.NOTION_CREW_OUTPUTS_DB || "",
  HUMAN_REVIEWS: process.env.NOTION_HUMAN_REVIEWS_DB || "",
  PROJECT_TASKS: process.env.NOTION_PROJECT_TASKS_DB || "",
  DECISIONS: process.env.NOTION_DECISIONS_DB || "",
};

// Save crew output to Notion
export async function saveCrewOutput(crew: string, content: string) {
  if (!DATABASES.CREW_OUTPUTS) {
    console.warn("NOTION_CREW_OUTPUTS_DB not set");
    return null;
  }
  
  return await notion.pages.create({
    parent: { database_id: DATABASES.CREW_OUTPUTS },
    properties: {
      Name: { title: [{ text: { content: `${crew} output` } }] },
      Status: { select: { name: "Pending Review" } },
      Date: { date: { start: new Date().toISOString() } },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: `${crew} Crew Output` } }] },
      },
      {
        object: "block",
        type: "code",
        code: {
          rich_text: [{ text: { content } }],
          language: "markdown",
        },
      },
    ],
  });
}

// Create human review task
export async function createHumanReviewTask(crew: string, task: string, urgency: "low" | "medium" | "high" = "medium") {
  if (!DATABASES.HUMAN_REVIEWS) {
    console.warn("NOTION_HUMAN_REVIEWS_DB not set");
    return null;
  }
  
  return await notion.pages.create({
    parent: { database_id: DATABASES.HUMAN_REVIEWS },
    properties: {
      Name: { title: [{ text: { content: `[${crew}] ${task}` } }] },
      Status: { select: { name: "Awaiting Review" } },
      Priority: { select: { name: urgency } },
    },
  });
}

// Record project decision
export async function recordDecision(
  context: string,
  decision: string,
  rationale: string
) {
  if (!DATABASES.DECISIONS) {
    console.warn("NOTION_DECISIONS_DB not set");
    return null;
  }
  
  return await notion.pages.create({
    parent: { database_id: DATABASES.DECISIONS },
    properties: {
      Name: { title: [{ text: { content: decision } }] },
      Context: { rich_text: [{ text: { content: context } }] },
      Rationale: { rich_text: [{ text: { content: rationale } }] },
      Date: { date: { start: new Date().toISOString() } },
    },
  });
}

// Push protocol docs to Notion
export async function syncProtocolDocs(docs: { title: string; content: string }[]) {
  // Implementation for syncing CLAUDE.md sections to Notion
  for (const doc of docs) {
    await notion.pages.create({
      parent: { database_id: DATABASES.PROJECT_TASKS || "" },
      properties: {
        Name: { title: [{ text: { content: doc.title } }] },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ text: { content: doc.content } }] },
        },
      ],
    });
  }
}

export default notion;