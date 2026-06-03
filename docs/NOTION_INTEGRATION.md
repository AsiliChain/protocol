# Notion Integration Setup

AsiliChain uses Notion as the human-in-the-loop layer for CrewAI outputs and project documentation.

## Prerequisites

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Get your internal integration token
3. Create the following databases in Notion:

## Required Notion Databases

### 1. Crew Outputs
Properties:
- **Name** (Title)
- **Status** (Select: Pending Review, Approved, Rejected)
- **Date** (Date)
- **Crew** (Select: docs_audit, outreach, contract_reviewer, etc.)
- **Output Type** (Select: Report, Email, Patch, Content)

### 2. Human Reviews
Properties:
- **Name** (Title)
- **Status** (Select: Awaiting Review, Approved, Rejected)
- **Priority** (Select: Low, Medium, High)
- **Due Date** (Date)
- **Reviewer** (Person)

### 3. Project Decisions
Properties:
- **Name** (Title)
- **Context** (Text)
- **Rationale** (Text)
- **Date** (Date)
- **Deciders** (Person)

### 4. Protocol Tasks
Properties:
- **Name** (Title)
- **Status** (Select: Backlog, In Progress, Done)
- **Priority** (Select: Critical, High, Medium, Low)
- **Category** (Select: Contracts, API, USSD, Research, Outreach)

## Environment Variables

Add to `.env`:

```bash
NOTION_TOKEN=ntn_your_token_here
NOTION_CREW_OUTPUTS_DB=your_database_id
NOTION_HUMAN_REVIEWS_DB=your_database_id
NOTION_DECISIONS_DB=your_database_id
NOTION_PROJECT_TASKS_DB=your_database_id
```

## Usage

### Save Crew Output
```typescript
import { saveCrewOutput } from './lib/notion';

await saveCrewOutput('contract_reviewer', reviewContent);
```

### Create Human Review Task
```typescript
import { createHumanReviewTask } from './lib/notion';

await createHumanReviewTask('outreach', 'Review and approve email drafts', 'high');
```

### Record Decision
```typescript
import { recordDecision } from './lib/notion';

await recordDecision(
  'Contract deployment order',
  'Deploy FarmerRegistry first, then CreditScore, etc.',
  'CreditScore needs no dependencies, LendingVault needs all others'
);
```

## Human Gate Workflow

1. CrewAI generates output
2. `saveCrewOutput()` pushes to Notion "Crew Outputs" database
3. Human reviews in Notion, changes Status to "Approved" or "Rejected"
4. `createHumanReviewTask()` creates follow-up if rejected
5. Goose reads Notion for next actions

## API Endpoints

POST `/api/notion/crew-output` — Save crew output
POST `/api/notion/human-review` — Create review task
GET  `/api/notion/reviews/pending` — Get pending reviews
POST `/api/notion/decision` — Record decision