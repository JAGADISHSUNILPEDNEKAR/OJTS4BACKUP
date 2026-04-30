# Origin — Video Submission Script
> **How to use this:** Read naturally, at a comfortable pace. Pause at every `[ PAUSE ]` marker. Lines in *italics* are stage directions — don't read them out loud.

---

## 🎬 PART 1 — The Intro (30 seconds)

Hi, I'm [Your Name], and I built **Origin** — a Supply Chain Intelligence Platform.

Here's the problem I set out to solve: global supply chains are fragmented, opaque, and deeply vulnerable to fraud. Origin is my attempt to fix that — by providing a high-integrity layer for tracking shipments, verifying data cryptographically, and securing payments end-to-end.

`[ PAUSE ]`

---

## 🎯 PART 2 — The Core Problem (45 seconds)

The challenge I kept coming back to is what I call **"Trust at Scale."**

Think about it — if a shipment claims to originate from Peru, how do you *actually* prove it didn't come from a high-risk region? You can't just rely on what's written on a document.

So my goal with Origin wasn't just to build a tracker. It was to build a system that **proactively detects anomalies** and guarantees that data can never be silently tampered with — by anyone.

`[ PAUSE ]`

---

## ⚙️ PART 3 — What I Built (2 minutes)
*Switch to VS Code now.*

To solve this, I built Origin on **React and Next.js**, using a microservices architecture. Let me walk you through the three decisions I'm most proud of.

---

### 🔍 Decision 1 — The Hybrid ML Risk Engine
*Open `/services/ml_service/models/inference.py` and hover over Line 22.*

The first is the **Hybrid ML Risk Engine.** I implemented a dual-layer approach here.

This first section — the `assess_risk` function — handles what I call the "red flags": deterministic rules for things like high-risk countries, suspicious keywords, or known bad actors. These give you fast, explainable rejections for threats you already know about.

`[ PAUSE ]`

*Hover over Line 80.*

But the second layer is where it gets interesting. This is the **Isolation Forest model.** Rather than checking against a fixed list of rules, it calculates an anomaly score — so if a reading like humidity or route deviation is mathematically *distant* from historical norms, it gets flagged, even if it doesn't technically break any rule.

*Hover over Line 104.*

And here's the key design decision: a **70/30 hybrid split** between the two. Rules give you explainability. The ML model catches the subtle, unknown patterns that no human would ever write a rule for.

`[ PAUSE ]`

---

### 🔐 Decision 2 — The Rust Cryptographic Core
*Open `/services/crypto-service/src/main.rs` and hover over Line 135.*

The second major decision was building the integrity layer in **Rust** — specifically for performance and memory safety.

Here, we aggregate all the events for a shipment into a **Merkle Tree.** What that does is compress the entire history of that shipment — every sensor log, every checkpoint — into a single 32-byte root hash.

*Hover over Line 160.*

Then, once we have that root, we **anchor it to the Bitcoin blockchain.** From that point on, the entire history of that shipment is mathematically immutable. Anyone in the world can verify it, and no one can quietly change it.

`[ PAUSE ]`

---

### 💰 Decision 3 — Secure BTC Escrow
*Hover over Line 234.*

The third piece is the **2-of-3 multisig escrow.** Using PSBTs — Partially Signed Bitcoin Transactions — we hold funds in escrow and only release them when the ML engine confirms the shipment arrived without any critical risk flags.

So the payments layer is directly tied to the integrity layer. No clean bill of health from the ML engine, no payment. It's trustless by design.

`[ PAUSE ]`

---

## 📊 PART 4 — The Demo (2.5 minutes)
*Switch to the live dashboard now.*

Alright, let me show you this in action.

On the dashboard, you can see we're currently monitoring over **180,000 shipments** in real time. The ML engine is maintaining **99.8% precision** — flagging things like Origin Mismatches the moment they're detected, before a shipment is ever compromised.

`[ PAUSE ]`

*Point to the escrow panel.*

Over here, you can see we have more than **33,000 BTC** held securely in escrow — all backed by the multisig contracts I just walked you through.

`[ PAUSE ]`

*Point to the ML Risk Feed.*

And this is the ML Risk Feed — this is where those Isolation Forest anomalies surface directly as actionable alerts. Complex telemetry, turned into something an operator can actually act on.

`[ PAUSE ]`

---

## 🏁 PART 5 — The Close (20 seconds)

What Origin ultimately does is transform supply chain logs from *"notes on a page"* into *"cryptographically verifiable facts."*

That shift — from trusted documents to provable data — is how we reduce fraud losses by over **40%** and bring real accountability to global trade.

Thanks for watching.

---

> **A few tips before you hit record:**
> - Keep this on a second screen or printed out — don't let the camera catch you reading
> - Speak slower than you think you need to, especially during the code sections
> - If you stumble, just pause, breathe, and continue — don't restart the whole take
> - The close is your strongest moment — deliver it with confidence, not speed
