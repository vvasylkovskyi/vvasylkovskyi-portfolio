# LLM Day Lisbon — Talk Prep Guide

Topic: Multi-Agent Architectures (OpenClaw · Claude Code · LangGraph)

Timeline: ~2 months out

## Your Authority Stack

You have three distinct, real layers of experience — own them:

| Layer | What you have |
|---|---|
| OpenClaw | Hands-on blog series on a 150K+ star platform, published while the community is actively growing |
| Claude Code | Building multi-agent skills in a newer, less-documented space — almost no one has published on this specifically |
| LangGraph @ PagerDuty | Production distributed multi-agent system across multiple machines at a real engineering org |

Key reframe: You’re not theorizing — you’ve touched multi-agent architectures at three different levels of abstraction. That breadth is rare at conferences.

## Talk Structure

1. The problem — why single agents fail at real complexity (1–2 min)
2. Your setup — actual architecture, tool choices, tradeoffs (5–7 min — this is the meat)
3. What broke — honest war stories build enormous trust (3–4 min)
4. Patterns that emerged — generalize your experience into principles (3–4 min)
5. What I’d do differently — signals self-awareness, not weakness (1–2 min)
6. Last slide — blog URL + “the full architecture diagram is here”

## The Centerpiece: Tool Comparison

Make the cross-tool comparison the core of your talk. Almost no one has run all three — you have.

| Tool | Orchestration control | State management | Cross-machine comms | Best for |
|---|---|---|---|---|
| OpenClaw | LLM-driven | Session-based | Via channels | Always-on assistants |
| Claude Code | LLM-driven | Context window | Via channels | Dev pipelines |
| LangGraph | Deterministic | Graph nodes | ✓ (your PD work) | Production workflows |

The deterministic vs. LLM-driven orchestration tradeoff is one of the central tensions in multi-agent design — and you’ve lived both sides of it.

## Handling “I’m Not an Expert”

Reframe your opening:

- Don’t say “I’ll teach you multi-agent architectures.”
- Say: “I’m going to show you what I actually shipped, why I made the tradeoffs I did, and where it fell apart.”

Specificity = authority. The most credible dev talks are “here’s what I built, here’s what broke.” Not “here is the definitive guide.”

### Prepare your “I don’t know” answer

> “I haven’t tested that specifically — what I can tell you is in my setup, I saw [related behavior].”

Never fake it.

Your PagerDuty work is your strongest card when someone questions your credentials. Production systems at an incident management company is concrete proof.

## 2-Month Content Plan

### Now → Week 4

- Publish: Claude Code multi-agent skills post
- Publish: OpenClaw introduction series (already started — keep going)
- Publish: The comparison post “OpenClaw vs Claude Code vs LangGraph — three ways to architect multi-agent systems”

### Week 4 → Week 6

- Write your architecture diagrams — one diagram per tool/setup
- Annotate why each decision was made
- Write a PagerDuty LangGraph post (check what you can share publicly)

### 2 Weeks Before the Talk

- Publish a talk preview post on iac-toolbox.com
- Post it on LinkedIn/X
- Put your architecture diagrams in the blog

### Talk Week

- Final slide = blog URL only

## Blog Post List (iac-toolbox.com)

| # | Title | Status | Purpose |
|---|---|---|---|
| 1 | OpenClaw Introduction Series | In progress | Foundation, establishes presence |
| 2 | Claude Code Multi-Agent Skills | To write | Fills a genuine content gap |
| 3 | OpenClaw vs Claude Code vs LangGraph | To write | Talk companion, main traffic driver |
| 4 | Debugging Multi-Agent Loops: What the Diagrams Don’t Tell You | To write | War stories = trust |
| 5 | Distributed LangGraph Agents Across Machines | To write | PagerDuty work, your strongest credential |
| 6 | Why I Chose Claude Code Over LangGraph for My Agent Orchestration | To write | Decision-making transparency, builds credibility |
| 7 | My Claude Code + LangGraph Hybrid Setup Explained | To write | Shows nuance — not tribal, uses right tool for the job |
| 8 | The Infrastructure Behind My Multi-Agent Setup | To write (before conf.) | Talk companion post — connects IaC roots to agent orchestration, give attendees a URL to go deeper |
| 9 | LLM Day Talk Preview | To write (2 weeks before) | Pre-conference audience building |

## The Infrastructure Bridge

Your blog is IaC-focused — and multi-agent systems are infrastructure now. Use that angle explicitly:

> “I’ve spent years thinking about how to provision and manage infrastructure reliably. Multi-agent AI is the same problem — just with LLMs as the compute layer.”

This connects your existing audience to the new content, and it’s a unique angle no one else at the conference will have.

## Using Your Blog as Credibility Shorthand

Your blog does more than host content — it’s a signal. Three specific ways to use it:

1. The talk-companion post — before the conference, publish “The Infrastructure Behind My Multi-Agent Setup” — explicitly connecting your Terraform/AWS background to how you think about agent orchestration.
2. The diagram page — attendees should be able to scan one page and understand the architecture at a glance.
3. The final slide — simple, memorable, and drives post-talk traffic.
