# IIMAGINE Desktop Companion — Product Plan

## Vision

A privacy-first, open-source AI desktop app with a WordPress-style plugin ecosystem. Free core for everyone. Paid plugins for professionals and business owners. Users own their data and choose their privacy level.

---

## Product Layers

### Layer 1: Free Open-Source Core

The base app that anyone can download and use without an account.

**What's included:**
- Chat UI with conversation history (SQLite)
- Three-tier privacy selector (Local / Regional Cloud / API Key)
- Ollama integration for local model management
- Model recommendation wizard (user enters hardware specs + use case → suggested model)
- Basic RAG (upload documents, ask questions)
- Plugin system (install, enable, disable, uninstall)
- Settings, media storage, system tray

**What's NOT included (requires plugins):**
- Memory / personalization
- Industry-specific workflows
- Business management tools
- Cloud sync

**Auth:** Not required. The app works fully offline with local models. Auth is only needed when a user installs a paid plugin or uses cloud provider tiers.

### Layer 2: Cortex Lite Plugin (Paid — Memory & Personalization)

A simplified version of the web Cortex memory system, adapted for local-first SQLite storage.

**What it does:**
- Extracts entities, preferences, and facts from every conversation
- Builds a local knowledge graph (people, places, topics, relationships)
- Retrieves relevant context before generating responses
- Learns communication preferences over time
- All data stays on the user's machine

**How it differs from web Cortex:**
- No SCOPED onboarding flow (too complex for desktop)
- No My Life modules (replaced by simpler "topics" in the KG)
- No Daily Briefing (desktop users aren't checking email summaries)
- No actions system (no Google Sheets, Calendar, etc.)
- Simpler entity extraction (LLM-based, not the full CPU pipeline)
- No vector DB for embeddings — uses sqlite-vec which is already installed

**Technical approach:**
- chatPostprocess hook: after every message, fire-and-forget extraction
- LLM prompt extracts: entities (name, type), relationships, user preferences, facts
- Stores in SQLite tables: entities, relationships, preferences, facts
- chatPreprocess hook: before every message, query KG for relevant context
- Inject context into system prompt (capped at token budget)
- Preference table tracks: response style, topics of interest, communication tone

### Layer 3: Business Advisor Plugin (Paid — The Differentiator)

An AI business management advisor powered by guided setup + advanced memory. This is the plugin that no competitor has and that leverages your direct experience.

---

## Business Advisor Plugin — Detailed Plan

### Concept

A guided onboarding wizard collects structured information about the user's business, populates the knowledge graph, then provides ongoing personalized advice about growth, operations, finance, team management, and problem-solving. The AI gets smarter about the specific business over time as the user continues to interact.

### Guided Setup Flow

The setup is a multi-step wizard (not a chat conversation). Each step is a focused form with clear fields. The user can skip steps and come back later. Progress is saved.

**Step 1: Business Basics**
- Business name
- Industry / sector
- Business model (product, service, SaaS, marketplace, agency, etc.)
- Stage (idea, pre-revenue, early revenue, growth, mature)
- Year founded
- Location / markets served

**Step 2: Financial Snapshot**
- Annual revenue (range selector, not exact — reduces friction)
- Monthly burn rate / operating costs (range)
- Funding status (bootstrapped, angel, seed, series A+, profitable)
- Runway remaining (if applicable)
- Revenue trend (growing, flat, declining)

**Step 3: Team & Operations**
- Team size (range)
- Key roles filled / missing
- Biggest operational bottleneck (free text)
- Tools currently used (CRM, accounting, project management — checklist)

**Step 4: Goals & Challenges**
- Top 3 business objectives (free text, one per field)
- Biggest challenge right now (free text)
- Timeline for key goals (dropdown: 3 months, 6 months, 1 year, 2+ years)
- What's been tried that didn't work (optional, free text)

**Step 5: Competitive Landscape**
- Main competitors (names, optional)
- What differentiates the business (free text)
- Biggest competitive threat (free text)

**Step 6: Owner / Manager Profile**
- Role in the business (founder, CEO, manager, etc.)
- Strengths (checklist: sales, product, tech, finance, marketing, operations, leadership)
- Areas wanting to improve (same checklist)
- Decision-making style (data-driven, intuitive, collaborative — radio)

All of this data is stored as structured entities and relationships in the local KG. Nothing leaves the machine.

### How the Advisor Works After Setup

**Context injection:** Every chat message gets enriched with relevant business context from the KG before being sent to the LLM. If the user asks "how should I handle a team member who's underperforming?", the system pulls: team size, business stage, owner's leadership style, current challenges, and any prior conversations about team issues.

**Ongoing learning:** Every conversation updates the KG. If the user mentions they just hired a marketing person, that gets extracted and stored. Next time they ask about marketing, the AI knows they have someone on it.

**Proactive patterns:** The plugin can detect patterns across conversations:
- User keeps mentioning cash flow → surface financial planning suggestions
- User hasn't mentioned progress on stated goals → gentle check-in
- User describes a problem that contradicts their stated strategy → flag the inconsistency

**Advisor modes (sidebar tabs in the plugin UI):**

1. **Chat** — General business conversation with full context. This is the default.

2. **Dashboard** — Visual summary of the business profile. Shows: goals and progress, team overview, financial health indicators, recent topics discussed. All generated from KG data, not hardcoded.

3. **Strategy Review** — On-demand analysis. User clicks "Review my strategy" and the AI generates a structured assessment based on everything it knows: what's working, what's at risk, what to focus on next. Uses the SCOPED-like framework internally (status vs objective, challenges vs enablers) but presents it in plain business language.

4. **Decision Helper** — User describes a decision they're facing. The AI pulls all relevant context and presents: pros/cons based on the specific business situation, what similar decisions have led to in past conversations, questions the user should consider, a recommended path with reasoning.

### KG Schema for Business Data

```
entities:
  - type: business        (name, industry, stage, model, founded, location)
  - type: person          (name, role, relationship to business)
  - type: goal            (description, timeline, priority, status)
  - type: challenge       (description, severity, related_goal)
  - type: competitor      (name, threat_level, differentiator)
  - type: tool            (name, category, satisfaction)
  - type: financial_metric (type, value, trend, as_of_date)
  - type: decision        (description, date, outcome, context)

relationships:
  - business → has_goal → goal
  - business → faces_challenge → challenge
  - business → competes_with → competitor
  - person → works_at → business
  - goal → blocked_by → challenge
  - decision → relates_to → goal
  - challenge → mitigated_by → tool
```

### Pricing

- Subscription: tied to IIMAGINE account
- Free trial: 14 days full access
- Pricing TBD but positioned as "fraction of the cost of a business coach"

---

## Implementation Phases

### Phase 1: Core Cleanup (prerequisite for everything)

**Goal:** Ship a clean, auth-optional open-source core.

1. Make auth optional — app works without IIMAGINE account
2. Add model recommendation wizard to Settings
   - User enters: RAM, GPU (if any), primary use case (chat, coding, writing, analysis)
   - System recommends model + shows estimated performance
3. Polish existing chat, RAG, and model management UX
4. Harden the plugin system
   - Define clear plugin API surface (what hooks exist, what data plugins can access)
   - Add plugin conflict detection (two plugins modifying the same message)
   - Add plugin versioning and compatibility checks
5. Remove any IIMAGINE-specific branding from the core (make it neutral for open source)
6. Write plugin developer documentation

**Deliverable:** Downloadable app (Mac + Windows) that works out of the box with Ollama.

### Phase 2: Cortex Lite Plugin

**Goal:** Ship the memory system as the first paid plugin.

1. Build entity extraction pipeline
   - chatPostprocess hook fires after every assistant response
   - LLM prompt extracts: entities, relationships, preferences, facts
   - Stores in SQLite via plugin's own tables (not core tables)
2. Build context retrieval pipeline
   - chatPreprocess hook fires before every user message
   - Queries KG for entities related to the current topic
   - Queries recent conversation summaries
   - Injects relevant context into system prompt
   - Respects token budget (configurable, default 2000 tokens of context)
3. Build preference learning
   - Track: preferred response length, formality, topics of interest
   - Apply preferences to system prompt automatically
4. Build memory management UI
   - Settings panel showing: entity count, relationship count, storage size
   - Ability to view, edit, delete specific memories
   - "Forget everything" button
5. Test with real conversations across multiple sessions

**Deliverable:** Installable plugin that makes the AI remember and personalize.

### Phase 3: Business Advisor Plugin

**Goal:** Ship the guided business setup + ongoing advisory.

1. Build the guided setup wizard (6 steps as described above)
   - Each step saves to KG immediately (no "submit all at once")
   - Progress indicator, skip/back navigation
   - Can be re-entered to update information
2. Build the business context injection layer
   - Extends Cortex Lite's context retrieval
   - Adds business-specific entity weighting (goals and challenges rank higher)
   - Adds temporal awareness (recent financial data > old data)
3. Build the Dashboard tab
   - Renders business profile summary from KG
   - Shows goals with inferred progress status
   - Shows team overview
   - Shows recent conversation topics
4. Build the Strategy Review feature
   - Single-click generates a structured assessment
   - Uses all KG data + conversation history
   - Outputs: strengths, risks, focus areas, action items
5. Build the Decision Helper feature
   - User describes a decision
   - AI pulls relevant context and generates structured analysis
   - Saves decision and outcome to KG for future reference
6. Build ongoing extraction rules specific to business conversations
   - Detect financial updates, team changes, goal progress, new challenges
   - Update KG entities automatically

**Deliverable:** A plugin that turns the desktop app into a personalized business advisor.

### Phase 4: Plugin Marketplace

**Goal:** Enable discovery and installation of plugins from the web app.

1. Build marketplace UI on the IIMAGINE web app
   - Plugin listings with: name, description, author, rating, price, screenshots
   - Categories: Memory, Business, Legal, Accounting, Healthcare, Productivity
   - Install button that generates a download link / license key
2. Build marketplace client in the desktop app
   - Browse / search plugins from within Settings
   - One-click install (download zip, extract to plugins dir, activate)
   - License validation for paid plugins (check against IIMAGINE account)
   - Auto-update notifications
3. Build plugin submission flow for third-party developers
   - Upload plugin zip + manifest
   - Review process (manual initially)
   - Revenue share model (70/30 developer/platform, standard for marketplaces)

**Deliverable:** Working marketplace with at least 3-4 plugins listed.

### Phase 5: Vertical Industry Plugins

**Goal:** Build paid plugins for privacy-sensitive industries.

**Priority order (based on privacy sensitivity + willingness to pay):**

1. **Legal** — Document review, case summarization, client intake forms, precedent search, time tracking prompts. Lead with: "Your client data never leaves your machine."

2. **Accounting** — Financial statement analysis, tax planning conversations, client file review, compliance checklists. Lead with: "Discuss client financials with AI without violating confidentiality."

3. **Healthcare** — Patient note summarization, treatment plan discussion, medical literature Q&A. Lead with: "HIPAA-friendly AI — no patient data in the cloud."

4. **Real Estate** — Property analysis, market comparison, client communication drafts, deal tracking.

5. **Consulting** — Client engagement tracking, deliverable planning, proposal drafting, knowledge management across engagements.

Each vertical plugin follows the same pattern:
- Guided setup (collect industry-specific context)
- Custom UI tabs (not just chat)
- Pre-loaded prompt templates for common tasks
- Industry-specific entity extraction rules
- Optional RAG with curated knowledge bases

---

## Dependencies Between Phases

```
Phase 1 (Core Cleanup)
  └── Phase 2 (Cortex Lite) — needs plugin system + auth-optional
        └── Phase 3 (Business Advisor) — needs memory system
        └── Phase 5 (Verticals) — needs memory system
  └── Phase 4 (Marketplace) — needs plugin system + web app integration
```

Phase 3 and Phase 4 can run in parallel.
Phase 5 plugins can start development once Phase 2 is stable.

---

## What Makes This Defensible

1. **Memory system** — No desktop AI competitor has this. It's the core technical moat.
2. **Guided business setup** — Structured data collection is dramatically more useful than hoping users mention things in chat. This is domain expertise encoded into software.
3. **Plugin ecosystem** — Network effects. Once third-party developers build plugins, the platform becomes harder to replicate.
4. **Privacy positioning** — Not just "we don't collect data" but "here's a visual indicator showing exactly where your data goes for every message." Trust through transparency.
5. **Vertical depth** — Generic AI chat is a commodity. Industry-specific workflows with memory are not.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Local LLM quality too low for business advice | Default to "medium privacy" (Vertex) for complex analysis. Be transparent about model limitations in the UI. |
| Plugin conflicts break chat experience | Strict plugin API boundaries. Plugins can only modify messages through defined hooks. Core chat is always functional even if all plugins are disabled. |
| Users don't complete guided setup | Make every step independently valuable. Even partial data improves responses. Show immediate value after step 1. |
| Open source core gets forked without contributing back | Use a permissive license (MIT or Apache 2.0) for the core. Paid plugins are proprietary. The marketplace and memory system are the moat, not the chat shell. |
| Marketplace doesn't attract third-party developers | Ship 4-5 first-party plugins first to prove the model. Publish comprehensive plugin development docs. Offer early developer incentives. |

---

## Success Metrics

**Phase 1:** 1,000 downloads in first month. App runs without crashes on Mac + Windows.
**Phase 2:** 20% of free users try the Cortex Lite trial. 5% convert to paid.
**Phase 3:** Business Advisor plugin generates measurable recurring revenue. Users complete setup wizard at >60% rate.
**Phase 4:** 3+ third-party plugins submitted within 3 months of marketplace launch.
**Phase 5:** First vertical plugin (Legal) reaches 100 paying subscribers within 6 months.
