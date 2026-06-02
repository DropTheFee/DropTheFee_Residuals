# Gmail Inbox Audit — steve@dropthefee.com

**Generated:** 2026-06-02
**Mode:** Strictly READ-ONLY. No messages, labels, drafts, or settings were modified, created, archived, deleted, or sent. Only Gmail *search/read* tools were used.

---

## ⚠️ Methodology & confidence

- **Totals (Section 1):** provided/confirmed as **23,816 total inbox messages / 4,009 unread**. (Gmail's API exposes no count endpoint, so a full census would require paginating all ~480 pages; we did not do that.)
- **Top senders & categories (Sections 2–4):** **ESTIMATES** based on a **recent sample of ~250 messages** (the 5 most recent pages of 50 threads each), covering **2026-06-02 back to 2026-05-22 (~11 days)**.
- The category mix and the heaviest senders stabilized within the first 2–3 pages, so the **rankings and categories are reliable directionally**. **Exact counts are approximate** and carry two known biases:
  1. **Recency bias** — a recent window over-represents currently-active threads and unread mail (the sample is far more "unread-heavy" than the true 17% inbox average).
  2. **Thread vs. message** — Gmail returns *threads*; counts here are of individual INBOX-labeled messages within those threads.
- Want firmer numbers? I can extend the sample to the full ~1,500 (or run per-sender `from:` tallies) on request.

---

## 1. Inbox totals

| Metric | Count |
|---|---|
| Total messages in inbox | **23,816** |
| Unread | **4,009** (~17%) |
| Read | ~19,807 |

**Takeaway:** A 23.8k-message inbox with 4k unread is heavily backlogged. The sample shows the daily inflow is roughly **40–50 messages/day**, the large majority of which are newsletters, marketing, and automated notifications.

---

## 2. Top senders by volume (estimated, ~250-msg recent sample)

Counts = messages observed in the sample. Treat as relative volume, not absolute totals.

| # | Sender | ~Count | Type |
|---|---|---|---|
| 1 | `no-reply@dropthefee.info` | ~14 | Your own system: merchant status-change + support-ticket notifications |
| 2 | `updates@emails.dailygopnews.com` | ~8 | Political fundraising |
| 3 | `philip@highachieversociety.com` | ~8 | Coaching/marketing drip |
| 4 | `Zach.Hooper@electronicpayments.com` | ~7 | **Real human** — EPI/TableTurn rep (Alchemy project) |
| 5 | `jessica@mediabloom.ccsend.com` | ~5 | Cold sales (lead-gen pitch) |
| 6 | `no-reply@mail.instagram.com` | ~5 | Social notifications (getsurj) |
| 7 | `notification@service.tiktok.com` | ~5 | Social notifications |
| 8 | `Admin@threaded.cc` | ~5 | WordPress/WooCommerce site reports (surj.app store) |
| 9 | `marketingsupport@dejavoo.io` | ~4 | Vendor marketing (Dejavoo) |
| 10 | `noreply@gohighlevel.com` | ~4 | SaaS product updates (HighLevel) |
| 11 | `hi@intro.co` | ~4 | Marketing |
| 12 | `notifications@app.basecamp.com` / `3.basecamp.com` | ~4 | Project-mgmt notifications (**work-relevant**) |
| 13 | `no-reply@dejavoosystems.com` | ~4 | OTP/login codes + SAFE risk alerts (**transactional**) |
| 14 | `do-not-reply@intuit.com` | ~4 | Payments/payroll confirmations (**transactional**) |
| 15 | `billing-support@supabase.com` | ~4 | Billing dunning — payment-failure notices (**needs attention**) |
| 16 | `noreply@notify.cloudflare.com` | ~3 | Domain/renewal/invoice notices (**transactional**) |
| 17 | `email@news.temuemail.com` | ~3 | Shopping marketing |
| 18 | `Molly@thepreparedperformer.com` | ~3 | Marketing/coaching |
| 19 | `Billy@billygene.com` | ~3 | Marketing |
| 20 | `brennan@hellovivid.com` | ~3 | Vendor marketing/webinars (Vivid) |
| 21 | `hello@onscreenauthority.com` | ~3 | Marketing |
| 22 | `dmarcreport@microsoft.com` | ~3 | Automated DMARC reports |
| 23 | `receipts@gohighlevel.com` | ~3 | Receipts (**transactional**) |
| 24 | `sales@payarc.com` | ~2 | Vendor marketing (Payarc) |
| 25 | `np@neilpatel.com` | ~2 | Marketing |

### Vendor "families" worth noting (combined volume is much larger than any single address)
- **GoHighLevel:** `noreply@gohighlevel.com`, `receipts@gohighlevel.com`, `invoice+statements@gohighlevel.com`, `noreply@mail.marketing.gohighlevel.com`, `support@mg.agencyownersupport.com` → combined ~12+
- **Dejavoo:** `marketingsupport@dejavoo.io`, `no-reply@dejavoosystems.com`, `product@dejavoo.io`, `igoren@dejavoo.io` → combined ~10
- **Vivid / hellovivid:** `brennan@`, `kyle@`, `derek@`, `boarding@hellovivid.com` → combined ~8 (mix of marketing **and** real reps)
- **AWS:** `no-reply@amazonaws.com`, `invoicing@aws.com`, `health@aws.com` → recurring billing/health alerts

---

## 3. Senders grouped into categories

**A. Your own automated business notifications** (internal systems)
- `no-reply@dropthefee.info` — merchant status changes, support tickets, undelivered-mail reports
- `notifications@app.basecamp.com` / `3.basecamp.com` — task/project activity
- `notifications@canny.io` — product feedback digests
- `no-reply@coastalpaydashboard.com`, `noreply@electronicpayments.com` (file-build notes), `no-reply@zoom.us` (voicemails)
- `dmarcreport@microsoft.com` — DMARC aggregate reports

**B. Receipts / transactional / billing** (often important)
- Intuit/QuickBooks (`do-not-reply@intuit.com`, `No_Reply@notifications.intuit.com`), Gusto (`gustonoreply@`, `recovery@gusto.com`)
- Supabase billing, Stripe `failed-payments@`, Cloudflare invoices, AWS billing, Google Workspace (`payments-noreply@google.com`)
- Processor/statement mail: `Statements@paycosmos.com`, `invoice+statements@linqapp.com`, `resellersupport@authorize.net`, `invoice@cybersource.com`, `outgoing@safewebservices.com`
- Financial statements: Navy Federal, SBA (`lending.sba.gov`), TD Auto Finance, Bitty
- OTP/security codes: `no-reply@dejavoosystems.com`, `supportnoreply@authorize.net`, `mail.anthropic.com` login links

**C. Newsletters / marketing — payments & business-tools industry**
- Dejavoo, Payarc, ValorPayTech, Paysafe, DCC Supply, CCSalesPro, Electran (`*.electran.org`), CyberSource `solutions@`
- SaaS/marketing: HighLevel roundups, Semrush, Neil Patel (`np@`, `neil@advanced.npdigital.com`), Twilio, Vercel, Grammarly, Elegant Themes (Divi), WooCommerce, Scalable.co, Intro.co

**D. Cold outreach / "biz-opportunity" & agency spam**
- `jessica@mediabloom.ccsend.com` / `info-mediabloom.us@shared1.ccsend.com`, `jessica@fundforgepro.online`, `vaishnavi@plannedwayagencylabs.info`, `gabir@tryemailoutreachgrid.com`
- Coaching/info-product drips: `philip@highachieversociety.com`, `Billy@billygene.com`, `Molly@thepreparedperformer.com`, `hello@onscreenauthority.com`, `paige@kismetideas.com`, `connect@mail.accidentalmba.com`, `findyourpeak@e.kajabimail.net`, `jesse@tryspringwind.com`, `gabor@trustindex.io`

**E. Political fundraising**
- `updates@emails.dailygopnews.com`, `updates@emails.stayinformednow.com`

**F. Social / consumer / shopping**
- Social: `no-reply@mail.instagram.com`, `notification@service.tiktok.com` (+ `info@service.tiktok.com`)
- Consumer/retail: Temu, Home Depot, 32Degrees, CustomInk, Vistaprint, Pura, Kodiak Coolers, GasBuddy, eBay, Spotify, Prime Video, Audible, Amazon reviews

**G. Real human correspondence** (the signal in the noise)
- `Zach.Hooper@electronicpayments.com` — EPI/TableTurn rep (Alchemy rollout)
- `kyle@hellovivid.com`, `derek@hellovivid.com` — Vivid Commerce (OverDryv/POS)
- `alchemybarok@gmail.com` (Kaden) — client, menu build
- `ml168@rochesterclinic.com` (Mei) — Lotus rebuild prospect/client
- `ron@aoxapps.com` — OverDryv vendor
- `ken@dropthefee.com` — colleague (residuals)
- `kfarmer@ndsncs.com` — merchant (terminal issue)
- `igoren@dejavoo.io` (Ilanit) — Dejavoo contact (DPP invoicing)
- `lbennett@bcmsmail.com` — residual report; `ScotSchroeder@gmail.com` — Google Chat ping; `drive-shares-dm-noreply@google.com` — shared doc from Elizabeth Barry

---

## 4. Clutter vs. needs-attention

### 🟢 Likely needs your attention (keep visible / triage first)
- **Real human threads** (Category G) — especially Zach Hooper (Alchemy go-live), Kyle/Derek (Vivid), Mei/Lotus, Kaden/Alchemy menu, Ken (residuals).
- **Billing problems that can break things:**
  - `billing-support@supabase.com` — repeated **payment failure / pending shutdown** notices
  - Stripe `failed-payments@` — **$100 to MetaGPT failing repeatedly**
  - `no-reply@amazonaws.com` — **AWS account past due**
  - `invoice@cybersource.com` — auto-payment rejected (expired card)
  - `recovery@gusto.com` — **payroll blocked, outstanding balance**
- **Operational alerts:** `no-reply@dejavoosystems.com` SAFE risk alert (refund limit); `health@aws.com` RDS deprecation; Cloudflare/Hostinger domain renewals & transfers (dropthefee.io / mhmwindows.com).
- **Transactional records** you may want to keep/file: Intuit, Gusto, processor statements, Linq, Authorize.Net.

### 🔴 Likely clutter (safe candidates to filter/bulk-handle)
- **Political fundraising** (dailygopnews, stayinformednow) — pure clutter.
- **Cold outreach / agency & coaching spam** (Category D) — high volume, low value: mediabloom, fundforgepro, plannedwayagencylabs, highachieversociety, billygene, thepreparedperformer, onscreenauthority, kismetideas, etc.
- **Social notifications** (Instagram, TikTok) and **consumer/retail promos** (Temu, Home Depot, 32Degrees, Vistaprint, GasBuddy, Pura, etc.).
- **Low-value vendor marketing blasts** — the marketing arms of Dejavoo, Payarc, ValorPayTech, HighLevel roundups, Semrush, Neil Patel, etc. (Note: keep the *transactional/security* mail from these same vendors.)
- **Noisy automated reports** you rarely read: `dmarcreport@microsoft.com`, `Admin@threaded.cc` weekly WordPress/WooCommerce summaries.

### 💡 Highest-leverage cleanup ideas
1. The **single biggest sender is your own `no-reply@dropthefee.info`** (~14 in sample). A rule to auto-label/skip-inbox these (keeping only ticket items) would cut a large chunk of noise.
2. **Unsubscribe + filter** the political and cold-outreach categories — they appear to be the largest pure-clutter buckets.
3. **Route social + retail promos** out of the inbox entirely (Gmail Promotions/Social-style filtering).

---

## 5. Existing Gmail labels / folders

System labels present (standard): `INBOX`, `UNREAD`, `STARRED`, `IMPORTANT`, `SENT`, `DRAFT`, `SPAM`, `TRASH`.

User-defined labels (33), grouped by hierarchy:

**DropTheFee**
- `DropTheFee`
- `DropTheFee/Admin`
- `DropTheFee/Admin/Important Administrative`
- `DropTheFee/Processors`
- `DropTheFee/Merchants`
- `DropTheFee/Merchants/Earnheart Propane`
- `DropTheFee/Vendors`
- `DropTheFee/Vendors/Dejavoo`
- `DropTheFee/Vendors/Dejavoo/Dejavoo Invoicing`
- `DropTheFee/Vendors/Linq`

**SüRJ**
- `SüRJ`
- `SüRJ/Admin`
- `SüRJ/Clients`
- `SüRJ/Vendors`
- `SüRJ/Development Team`
- `SüRJ/Development Team/Taiwo`
- `SüRJ/Development Team/Basecamp`

**OverDryv**
- `OverDryv`
- `OverDryv/Admin`
- `OverDryv/Clients`
- `OverDryv/Development`

**Operations**
- `Operations`
- `Operations/Accounting`
- `Operations/Banking`
- `Operations/Legal`
- `Operations/Payroll`
- `Operations/DMARC/inbox`

**Archive-Legacy**
- `Archive-Legacy`
- `Archive-Legacy/Legacy`
- `Archive-Legacy/Legacy/Steve@RMS-WorldPay.com`
- `Archive-Legacy/Legacy/Integrity Processing`

**Other / general**
- `Newsletters`
- `Read Later`

*(Observation: you have a solid label taxonomy already — but the sampled inbox mail is largely unlabeled and sitting in INBOX. The structure exists to triage into; it just isn't being applied to the incoming flood.)*

---

## 6. What this toolset can and cannot do on Gmail

These are the actual capabilities exposed by the connected Gmail tools. For this audit, **only the read-only ones were used.**

| Capability | Available? | Tool(s) |
|---|---|---|
| **Search messages/threads** | ✅ Yes | `search_threads` (Gmail query syntax: `from:`, `is:unread`, `label:`, dates, etc.) |
| **Read message/thread content** | ✅ Yes | `get_thread` (full bodies + headers) |
| **List labels** | ✅ Yes | `list_labels` |
| **List drafts** | ✅ Yes | `list_drafts` |
| **Add/remove labels** (incl. system labels) | ✅ Yes *(not used)* | `label_message` / `label_thread` / `unlabel_message` / `unlabel_thread` |
| **Archive** | ✅ Yes, indirectly *(not used)* | remove the `INBOX` label via `unlabel_*` |
| **Trash / untrash** | ✅ Yes, indirectly *(not used)* | add/remove the `TRASH` label via `label_*` (this is "move to Trash," **not** permanent erase) |
| **Mark read/unread, star, mark important** | ✅ Yes, indirectly *(not used)* | add/remove `UNREAD` / `STARRED` / `IMPORTANT` labels |
| **Create / rename / recolor / delete labels** | ✅ Yes *(not used)* | `create_label` / `update_label` / `delete_label` |
| **Create drafts** | ✅ Yes *(not used)* | `create_draft` (incl. replies, attachments) |
| **Send email** | ❌ **No** | No send tool is exposed — drafts can be created but not sent |
| **Permanently delete** | ❌ **No** | Only move-to-Trash (via `TRASH` label) is possible |
| **Create / edit Gmail filters or rules** | ❌ **No** | No filter/settings tool is exposed |
| **Change settings, forwarding, vacation responder, signatures** | ❌ **No** | Not exposed |

**Bottom line:** the toolset can read everything and can fully manage labels/organization (including archive, trash, mark-read, and drafting replies), but it **cannot send mail, cannot permanently delete, and cannot create the server-side filters** you'd want for automated ongoing cleanup. Those last items would need to be done by you in the Gmail UI.

---

*End of audit. No changes were made to the mailbox.*
