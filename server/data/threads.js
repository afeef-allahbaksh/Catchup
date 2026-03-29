const threads = [
  {
    id: "eng-api-migration",
    channel: "#engineering",
    topic: "API v2 Migration Plan",
    messages: [
      {
        author: "Sarah Chen",
        text: "Hey team — I've been scoping the API v2 migration and wanted to share where we're at. The main breaking change is moving from REST to gRPC for internal services, but we'll keep a REST gateway for external consumers.",
        timestamp: "2024-03-18T09:15:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "Makes sense. What's the timeline looking like? We've got the mobile release cut on April 5th and I don't want to be debugging protocol issues during the freeze.",
        timestamp: "2024-03-18T09:18:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Good call. I'm thinking we do the migration in three phases:\n1. Proto definitions + codegen (this week)\n2. Dual-write period where both REST and gRPC work (March 25 – April 4)\n3. Cut over internal services to gRPC-only after the mobile freeze lifts (April 7+)\nThat keeps us clear of Marcus's mobile release.",
        timestamp: "2024-03-18T09:22:00Z",
      },
      {
        author: "Priya Patel",
        text: "I can own the proto definitions. I've already sketched out the schema for the thread and message types based on what we have in the REST layer. Should have a PR up by Wednesday.",
        timestamp: "2024-03-18T09:25:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "Appreciate that Priya. One concern — Sarah Chen mentioned in standup that the notification service currently polls the REST endpoint every 30s. If we're dual-writing, are we doubling the load on the message store during phase 2?",
        timestamp: "2024-03-18T09:30:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Good catch. @James let's make sure the notification service switches to the gRPC stream early in phase 2 so we're not double-polling. Can you own that migration?",
        timestamp: "2024-03-18T09:33:00Z",
      },
      {
        author: "James Liu",
        text: "Yeah I'll take that. I need to audit the notification service anyway — there's a memory leak in the polling loop that's been bugging me. I'll fix both together. Should have it done by March 28.",
        timestamp: "2024-03-18T09:37:00Z",
      },
      {
        author: "Priya Patel",
        text: "Quick question — are we versioning the protos independently or bundling them with the main API version? If independently, I want to set up a separate proto registry now rather than refactoring later.",
        timestamp: "2024-03-18T09:40:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Independent versioning. Good thinking — set up the registry as part of your PR this week. Let's also add CI validation so proto changes don't break backward compat.",
        timestamp: "2024-03-18T09:43:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "Last thing — can someone update the API docs? External partners are going to ask about v2 at the developer meetup on April 10th. @Sarah should we draft a migration guide?",
        timestamp: "2024-03-18T09:47:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Yes, I'll write the external migration guide by April 8th. Priya — can you add inline doc comments to the proto definitions so we can auto-generate reference docs? Let's sync on Thursday to make sure we're all aligned before phase 1 wraps.",
        timestamp: "2024-03-18T09:50:00Z",
      },
    ],
  },
  {
    id: "design-thread-view",
    channel: "#design-review",
    topic: "Thread View Redesign — V2 Mockups",
    messages: [
      {
        author: "Lena Kowalski",
        text: "Sharing the updated mockups for the thread view redesign. Main changes from V1:\n- Collapsed reply chain by default (expand on click)\n- Inline reactions instead of hover menu\n- Thread metadata bar (participants, message count, last active) pinned at top\n- New 'catch up' button that triggers an AI summary\nFigma link: [thread-view-v2]",
        timestamp: "2024-03-19T14:00:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Love the catch-up button placement. Engineering question though — the collapsed reply chain means we need to change how we load messages. Right now we fetch the full thread on open. With collapsed view we could lazy-load replies and cut initial payload by ~60%.",
        timestamp: "2024-03-19T14:08:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "From mobile perspective: the inline reactions are going to be tough on small screens. The current hover menu actually works well on mobile because it uses a long-press sheet. Can we keep long-press on mobile and do inline on desktop?",
        timestamp: "2024-03-19T14:12:00Z",
      },
      {
        author: "Lena Kowalski",
        text: "Good point Marcus. I'll add a responsive variant — inline for desktop, long-press sheet for mobile. Should have updated mobile mocks by Friday.\n\nRe: Sarah Chen's lazy-loading idea — yes please. The less data we load upfront, the faster the thread opens. Especially on mobile where we're seeing 2-3s load times on long threads.",
        timestamp: "2024-03-19T14:18:00Z",
      },
      {
        author: "David Kim",
        text: "A11y review: the collapsed replies need clear ARIA labels — screen readers won't know there are hidden messages otherwise. I'd suggest something like 'N replies, click to expand'. Also the metadata bar should be a landmark region so keyboard users can jump to it.",
        timestamp: "2024-03-19T14:25:00Z",
      },
      {
        author: "Lena Kowalski",
        text: "Great catches David. I'll add those annotations to the Figma spec. Should we also add keyboard shortcuts for navigate-between-threads and expand/collapse?",
        timestamp: "2024-03-19T14:30:00Z",
      },
      {
        author: "David Kim",
        text: "Yes — j/k for next/prev thread and Enter to expand would match Slack's patterns. Users coming from Slack will expect that.",
        timestamp: "2024-03-19T14:33:00Z",
      },
      {
        author: "Priya Patel",
        text: "On the API side — the 'catch up' button will hit our summarize endpoint. With the API v2 migration happening, should I build that endpoint in gRPC from the start or do REST first and migrate later?",
        timestamp: "2024-03-19T14:38:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Build it in gRPC from the start since you're already doing the proto definitions. The REST gateway will expose it to the frontend automatically. No point building it twice.",
        timestamp: "2024-03-19T14:42:00Z",
      },
      {
        author: "Lena Kowalski",
        text: "One more thing — the AI summary card in the mockup currently shows a static text block. Should we stream the summary in (like ChatGPT) so users see it generating? Feels more responsive, especially for long threads.",
        timestamp: "2024-03-19T14:48:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Definitely stream it. We already have the streaming infra from the chat feature. I'll make sure the summarize endpoint supports SSE.",
        timestamp: "2024-03-19T14:52:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "Can we get a loading skeleton while the summary streams? A blank card with a spinner feels dated. I'll pull in the shimmer component from our design system.",
        timestamp: "2024-03-19T14:55:00Z",
      },
      {
        author: "Lena Kowalski",
        text: "Perfect — shimmer skeleton + streaming text. I'll update the interaction spec. Let's plan to have eng start on this after the API v2 phase 1 wraps. Target: frontend implementation begins April 1st, with the catch-up feature going to beta users by April 15th.",
        timestamp: "2024-03-19T15:00:00Z",
      },
    ],
  },
  {
    id: "incident-msg-delay",
    channel: "#incidents",
    topic: "INC-4827: Message delivery delays in EU region",
    messages: [
      {
        author: "On-Call Bot",
        text: "🚨 INCIDENT OPENED — INC-4827\nSeverity: P1\nImpact: Message delivery delays of 30-90s reported in EU-West region\nDashboard: grafana.internal/d/msg-delivery\nOn-call: James Liu",
        timestamp: "2024-03-20T03:12:00Z",
      },
      {
        author: "James Liu",
        text: "Ack. Looking at the Grafana board now. P99 delivery latency spiked from 200ms to 45s starting at 03:05 UTC. Only affecting eu-west-1, us-east looks healthy.",
        timestamp: "2024-03-20T03:14:00Z",
      },
      {
        author: "James Liu",
        text: "Found something. The message broker in eu-west-1 is showing consumer lag of 850k messages. Looks like 3 of 8 consumer pods are in CrashLoopBackOff. Pulling logs now.",
        timestamp: "2024-03-20T03:22:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Joining. I see in the deploy log that we rolled out notification-service v2.4.1 to EU at 02:58 UTC — right before the spike. James, is that the version with your polling loop changes?",
        timestamp: "2024-03-20T03:26:00Z",
      },
      {
        author: "James Liu",
        text: "No, my notification service changes haven't merged yet — still on my branch. v2.4.1 was Priya's config update for the new proto registry. Let me check if that touched the consumer config.\n\nUpdate: confirmed. v2.4.1 changed the Kafka consumer group ID format. The 3 crashed pods are failing to rejoin the consumer group because the new group ID has a character that the EU broker (older version) doesn't support.",
        timestamp: "2024-03-20T03:35:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Got it. Options:\n1. Roll back v2.4.1 in EU (fast fix, ~5 min)\n2. Upgrade the EU broker to match us-east (proper fix, ~30 min, some risk)\n\nI say we rollback first to stop the bleeding, then schedule the broker upgrade for the maintenance window.",
        timestamp: "2024-03-20T03:38:00Z",
      },
      {
        author: "James Liu",
        text: "Agreed. Rolling back now.\n\n03:42 — Rollback complete. Consumer pods recovering. Lag dropping — down to 200k and falling. P99 latency back to 800ms and improving.",
        timestamp: "2024-03-20T03:42:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Nice work James. Latency back to normal at 03:51. Marking as mitigated.\n\nWe need to figure out: why didn't our canary deployment catch this? The EU region should have gotten a 5% canary before full rollout. @Priya can you check if the deploy pipeline skipped the canary stage for this release?",
        timestamp: "2024-03-20T03:52:00Z",
      },
      {
        author: "Priya Patel",
        text: "Just checked — the canary stage ran but only validated HTTP health checks, not Kafka consumer health. The pods were passing health checks fine because the HTTP server starts before the Kafka consumer connects. So the canary looked green even though consumers were crashing.",
        timestamp: "2024-03-20T04:05:00Z",
      },
      {
        author: "Sarah Chen",
        text: "That's a gap. We need to add consumer lag as a canary metric. Also — should we gate EU deployments on broker version compatibility going forward? This would have been caught if the deploy checked broker version before rolling out. Who can own the postmortem doc and get it scheduled for next week?",
        timestamp: "2024-03-20T04:10:00Z",
      },
    ],
  },
  {
    id: "planning-q2",
    channel: "#team-planning",
    topic: "Q2 Planning — Messaging Team Priorities",
    messages: [
      {
        author: "Sarah Chen",
        text: "Kicking off Q2 planning. Based on our OKRs and what I've heard from product, here are the top candidates:\n\n1. API v2 migration (already in progress)\n2. Thread view redesign + catch-up feature\n3. End-to-end encryption for DMs\n4. Message search improvements (semantic search)\n5. Notification service reliability (eu-west incident follow-up)\n\nLet's stack rank these. I'll compile the final list for the leadership review on April 3rd.",
        timestamp: "2024-03-21T10:00:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "From mobile: #2 is our biggest user request. The thread view redesign will have the most visible impact. Catch-up feature is a huge differentiator vs Slack. I'd put it at #1 priority after we finish the API migration.",
        timestamp: "2024-03-21T10:08:00Z",
      },
      {
        author: "James Liu",
        text: "After the eu-west incident, I think #5 needs to be higher. We got lucky it was a fast rollback. If we don't add proper canary metrics for the broker infrastructure, the next incident could be worse. I can timebox it to 2 weeks if we scope it to just Kafka consumer health canaries + broker version gating.",
        timestamp: "2024-03-21T10:15:00Z",
      },
      {
        author: "Priya Patel",
        text: "I'm biased but #4 (semantic search) would pair really well with the catch-up feature. If users can search by meaning instead of exact keywords, the whole AI experience gets better. Plus I've been prototyping with embeddings and the results are promising — 40% better recall than keyword search on our test set.",
        timestamp: "2024-03-21T10:22:00Z",
      },
      {
        author: "David Kim",
        text: "#3 (E2E encryption) is coming from legal/compliance. They flagged it as a blocker for the enterprise deal with FinCorp — they won't sign without it. Timeline pressure is real: FinCorp decision is mid-May.",
        timestamp: "2024-03-21T10:30:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Okay, here's what I'm thinking for the final stack rank:\n\n1. API v2 migration — already underway, finish by mid-April\n2. Thread view redesign + catch-up — biggest user impact, start April 1\n3. E2E encryption for DMs — FinCorp blocker, James + David can start scoping in parallel\n4. Notification reliability — James timeboxes to 2 weeks post-incident\n5. Semantic search — Priya prototypes in 20% time, full build in Q3 if results hold\n\nDoes this feel right? I need to send this to leadership by end of day Thursday.",
        timestamp: "2024-03-21T10:40:00Z",
      },
      {
        author: "Marcus Johnson",
        text: "Looks solid. Only concern is bandwidth — if James is on E2E encryption scoping AND notification reliability AND the notification service migration for API v2... that's a lot of James. Sarah Chen, should we pull in someone from the platform team to help?",
        timestamp: "2024-03-21T10:45:00Z",
      },
      {
        author: "Sarah Chen",
        text: "Fair point. James — can the notification reliability work be done as part of the API v2 migration? Since you're already touching the notification service for the gRPC switch, adding canary metrics might be incremental.",
        timestamp: "2024-03-21T10:48:00Z",
      },
      {
        author: "James Liu",
        text: "Yeah actually that works. The canary metric work is mostly config + a new Grafana alert. I can bundle it with my notification service PR. That frees me up to start E2E encryption scoping in April.",
        timestamp: "2024-03-21T10:52:00Z",
      },
    ],
  },
];

export function getThread(id) {
  return threads.find((t) => t.id === id) || null;
}

export function getAllThreads() {
  return threads;
}
