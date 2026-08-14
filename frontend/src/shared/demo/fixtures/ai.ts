/** AI assistant — two canned conversations grounded in the fixture data. */
import type { ChatMessageItem, ChatSession, IngestStatus } from '@/modules/ai_chat/hooks/useAIChat'
import { daysAgo } from './helpers'

export const CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'chat-01',
    user_id: 'demo-user',
    title: 'Which items are still out at sites?',
    created_at: daysAgo(2, 9, 40),
    updated_at: daysAgo(2, 9, 44),
    message_count: 4,
    last_message_preview: 'The alignment telescope kit with Arjun Mehta is the overdue one…',
  },
  {
    id: 'chat-02',
    user_id: 'demo-user',
    title: 'Link health summary',
    created_at: daysAgo(1, 8, 15),
    updated_at: daysAgo(1, 8, 17),
    message_count: 2,
    last_message_preview: 'One of your two links is healthy; Adani HQ ↔ Shantigram is degraded…',
  },
]

const msg = (
  id: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  minutesAfter: number,
  base: number,
  sources: ChatMessageItem['sources'] = null,
): ChatMessageItem => ({
  id,
  session_id: sessionId,
  role,
  content,
  sources,
  token_count: role === 'assistant' ? Math.round(content.length / 4) : null,
  created_at: new Date(new Date(daysAgo(base, 9, 40)).getTime() + minutesAfter * 60_000).toISOString(),
})

export const CHAT_MESSAGES: Record<string, ChatMessageItem[]> = {
  'chat-01': [
    msg('m-01', 'chat-01', 'user', 'Which items are still out at sites?', 0, 2),
    msg(
      'm-02',
      'chat-01',
      'assistant',
      `Five items are currently away from the HQ store, across two projects:

**GIFT City Backbone POC** — gate pass \`GP2F7A91\`, expected back this week:

| Asset | Item | Status |
|---|---|---|
| AST-0104 | Indoor Unit — OpticSpectra 10G | Still out |
| AST-0107 | Outdoor Unit — OpticSpectra 10G | Still out |
| AST-0114 | Hybrid Cable 30 m | Still out |

**Adani Shantigram Campus Link** — left at site permanently (installed):

- AST-0117 · LC–LC patch cords, 10 m (×12)
- AST-0118 · Pole-mount clamp set (×20)

Two more items on the GIFT City pass (the optical power meter and 10 patch cords) already came back and are in stock.`,
      2,
      2,
      [
        {
          entity_type: 'movement',
          entity_id: 'gp2f7a91c4',
          name: 'Gate pass GP2F7A91',
          snippet: 'Soak-test rig for the 10G hop — spare heads plus test leads.',
        },
      ],
    ),
    msg('m-03', 'chat-01', 'user', 'And is anything overdue with a person?', 3, 2),
    msg(
      'm-04',
      'chat-01',
      'assistant',
      `Yes — one item:

- **AST-0121 · Alignment telescope kit** is with **Arjun Mehta**, expected back **3 days ago**. Neha chased it in her stock-audit update; there is also a pending handover that would pass it to Priya Sharma for the Surat survey.

Everything else with people (the spare 1G IU with Arjun, the spare 1G OU and the fusion splicer with Priya) has no return date set.`,
      4,
      2,
      [
        {
          entity_type: 'asset',
          entity_id: 'ast-tool-01',
          name: 'AST-0121 · Alignment telescope kit',
          snippet: 'Due back after the Infocity re-check.',
        },
      ],
    ),
  ],
  'chat-02': [
    msg('m-05', 'chat-02', 'user', 'Give me a link health summary.', 0, 1),
    msg(
      'm-06',
      'chat-02',
      'assistant',
      `Here is the picture across your two links:

| Link | Status | Notes |
|---|---|---|
| GIFT City ↔ Infocity | ✅ Working | 10G POC, soak test day 6 with zero uncorrected errors |
| Adani HQ ↔ Shantigram | 🔴 Faulty | Mast-side OU degraded, single-path link |

**What needs attention on Adani HQ ↔ Shantigram:**

1. Outdoor unit \`NW-OU-24024\` at Shantigram Mast is **FAULTY** — RX power at −28 dBm since the pre-monsoon storm (open HIGH-severity error, reported by Priya Sharma).
2. The link has **no RF failover** fitted, so the optical path is the only path.
3. A swap is scheduled: spare OU \`NW-OU-24028\` is bench-checked and with Priya; crane booked for Thursday 7 am.

**Watch item on GIFT City ↔ Infocity:** the Infocity side has no RF backup fitted yet — flagged in the link composition as the one missing unit.`,
      2,
      1,
      [
        {
          entity_type: 'device',
          entity_id: 'dev-13',
          name: 'NW-OU-24024',
          snippet: 'RX power dropped to −28 dBm after the pre-monsoon storm — suspected lens seal.',
        },
        {
          entity_type: 'pair',
          entity_id: 'pair-2',
          name: 'Adani HQ ↔ Shantigram',
          snippet: 'Campus link degraded: Shantigram OU faulty, RF-less link is down to one path.',
        },
      ],
    ),
  ],
}

export const sessionDetail = (sessionId: string) => ({
  session: CHAT_SESSIONS.find((s) => s.id === sessionId) ?? CHAT_SESSIONS[0]!,
  messages: CHAT_MESSAGES[sessionId] ?? [],
})

export const INGEST_STATUS: IngestStatus = {
  total_documents: 186,
  last_sync: daysAgo(0, 6, 30),
  // True so the page reads "AI Online". The auto-ingest POST this triggers is
  // rejected by the demo interceptor without reaching the network, and the
  // mutation has no error toast — so it stays silent.
  ollama_available: true,
  ollama_models: ['qwen3:8b', 'nomic-embed-text'],
  chat_model: 'qwen3:8b',
  embedding_model: 'nomic-embed-text',
  embedding_model_available: true,
  chat_model_available: true,
}
