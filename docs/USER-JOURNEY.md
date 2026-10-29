# DocCollect: complete user journey (draft for discussion)

Status: **draft, 27 Oct 2026.** Updated since: **checklists have a kind (Income tax, GST or TDS; Income tax covers everything on the PAN);** "Compliance" was renamed **Checklist**; the **period** was dropped for now (a request has a last date, not a period); the duplicate ("already asked") check was taken out; New request is three steps (What you need, Who to ask, Review and send). Nothing here is built yet unless it says so. Once agreed, this becomes the base for PRODUCT.md and for the screens.

Why this exists: the client list was changed to the unified model (one client per PAN, with registrations under it), but the rest of the flow was designed for the old model. This draft rebuilds the whole journey on the new model, one module at a time.

---

## 1. Words we use (one meaning each)

| Word | Means | Not to be called |
|---|---|---|
| **Client** | One PAN. A person or a business. | Customer, party |
| **Registration** | One thing the client is registered under: the **PAN for income tax (ITR)**, each **GSTIN**, each **TAN**. | Module, type, head |
| **Used for** | What a registration or checklist is about: **Income tax, GST or TDS** (badges ITR, GST, TDS). There is no "Other". The word "kind" is not used on screen. | Kind, type, module, service |
| **Contact** | A person who gets messages: name, mobile, email. A client has one or more. Each registration has one contact. | — |
| **Document** | A kind of paper we ask for: PAN card, Bank statement, GSTR-2B. Lives in the firm's Documents list. | — |
| **Checklist** | A saved checklist of documents for one job, with a kind: "ITR salaried" (ITR), "GST monthly" (GST). | Template, requirement |
| **Period** | What the work is for: a financial year (FY 2025-26), a quarter (Q2 FY 2026-27) or a month (Sep 2026). | — |
| **Request** | One checklist, for one period, sent to one or more registrations. "GST monthly · Sep 2026 · 40 GSTINs". | — |
| **Request line** | One registration inside a request. It has its own checklist, link and message. This is the unit of work. | — |
| **File** | What the client actually sent. It lands on a document of a request line, or in a folder, or waits to be placed. | — |

The screens must use only these words.

---

## 2. The model

```
Client (PAN)
 ├─ Registrations:  ITR (the PAN) · GST Maharashtra · GST Karnataka · TDS Head office
 │     └─ each has one Contact (the main contact unless another is picked)
 └─ Contacts:       Priya Shah (main) · Ankit Rao · Neha Kapoor

Checklist  =  kind + list of documents          ("GST monthly", GST, 4 documents)
Request     =  checklist + period + registrations of that kind
Request line =  one registration in a request    (own checklist, own link, own message)
```

**The one rule that fixes most of today's problems:** every checklist has a kind, and a request can only go to registrations of that kind. There is no "Other" kind: a checklist is always ITR, GST or TDS.

Everything else follows from it:

- The kind of a request is known for sure. No guessing from the title.
- New request knows which registrations to show (only GSTINs for a GST checklist).
- Filters, labels and Document Master folders all read the same kind.

---

## 3. The journey at a glance

```
 SET UP ONCE                SEND                     CLIENT ANSWERS             CA WORKS                    KEEP
 ───────────                ────                     ──────────────             ────────                    ────
 Firm + team         ──►   New request       ──►    WhatsApp message    ──►   Review each file    ──►    Document Master
 WhatsApp number           (checklist,             - upload link             approve / send back       Client / FY / kind
 KDK sync (clients)         period,                 - or files on chat       Place files that             / registration
 Documents list             registrations)          (own number only)          could not be matched
 Checklists                                                                 Remind / new link
                                                                             Request completes
```

Daily, the CA lives on the **Dashboard**: what to review, whom to remind, what is due.

---

## 4. Module by module

Each module says: who, where it starts, the steps, the rules, what is different from today, and what is still open.

### M1. First-time setup

**Who:** the firm Owner. **Starts:** first login.

1. **Firm details:** name, logo (used in messages and on the upload page).
2. **Clients:** synced from KDK. Shows "Synced: 420 clients · 310 GSTINs · 150 TANs". Nothing is typed in by hand.
3. **WhatsApp:** messages go from the CA Connect number by default. "Connect your own WhatsApp" can be done now or later (see M11).
4. **Team:** invite staff with a role (Owner, Admin, Staff).
5. **Documents and Checklists:** the starting set is ready (see M3). The firm can use it as it is.

**Rule:** the firm can send its first request without finishing 3 to 5.

**Open:** does the first-time setup need its own guided screen, or is Settings enough?

---

### M2. Clients and registrations

**Who:** CA, staff. **Starts:** Clients in the menu.

**Clients list:** one row per client (PAN). Columns: Client (name, PAN), Registrations (chips: ITR, GST 3, TDS), Main contact, Open requests. Filters: kind, has open requests, search (name, PAN, GSTIN, TAN, contact, mobile).

**Client page:**

| Part | What it shows |
|---|---|
| Header | Name, PAN, registration chips, main contact. Buttons: **New request**, **Open chat**. |
| Overview | Open requests (what is waiting on whom), recent files, main contact. |
| Registrations | One line per registration: kind, number, place, contact, WhatsApp / email on or off, open requests. **Change contact** on each line. |
| Requests | Every request line of this client, with kind, period, progress, status. |
| Documents | The client's Document Master folder. |

**Contacts:**
- Each registration has one contact. A new registration uses the main contact.
- Change contact: pick another contact of the client, or add a new one. Editing a contact changes it for every registration that uses it ("Applies to 2 registrations").
- WhatsApp cannot be on without a mobile. Email cannot be on without an email.

**Different from today:**
- The Registrations tab has been redesigned twice and taken back. Its design must be agreed (copy Compliance Tracker, or keep the plain table) **before** building again.
- Some sample contacts are named after the firm ("Priya Textiles Pvt Ltd"). A contact should be a person.

**Open:**
- Registrations as one table (today), or Income tax / GST / TDS tabs like Compliance Tracker?
- What happens when KDK moves a GSTIN to another PAN?

---

### M3. Setup: Documents and Checklists

**Who:** Owner, Admin. **Starts:** Setup.

**Documents list:** the firm's own list of documents, in groups (Identity, Income, Bank, GST, TDS...). Add, rename, delete, move between groups.

**Checklists:**
- Each checklist has a **name**, a **kind** (ITR, GST or TDS) and a **list of documents**.
- It also has a **period type**: yearly (ITR), quarterly (TDS), monthly or quarterly (GST). This decides what the CA picks as the period in New request.
- Starting set: ITR salaried, ITR business, GST monthly, GST quarterly, TDS quarterly.

**Different from today:** a checklist has no kind and no period type. Both are new.

**Open:** can a document belong to a kind (so a GST checklist only offers GST-ish documents), or is any document allowed in any checklist? Suggest: any document allowed, kind is only on the checklist.

---

### M4. New request

**Who:** CA, staff. **Starts:** "New request" (from the menu, Dashboard or a client page).

The order changes. The kind must be known first, so the right registrations can be shown.

| Step | What the CA does | Notes |
|---|---|---|
| **1. What** | Pick a checklist (or "Start from scratch" and pick the kind). Pick the period. | "GST monthly · Sep 2026". Title is made from these. |
| **2. Who** | Pick registrations. Only registrations of that kind are listed, grouped by client: "Priya Textiles · GST Maharashtra (27AAKC…)". Search, select all, filter. | For ITR: one line per client (the PAN). A line shows "WhatsApp off" when no message can go. |
| **3. Documents** | The checklist from the checklist, ready. Add or remove documents for this request only. | Changing it here does not change the saved checklist. |
| **4. Send** | Last date, which number it goes from, message preview (one real example). **Send N messages.** | Nothing goes until this button. |

After sending: "Sent to 38 registrations. 2 not sent (WhatsApp off)." with a link to the request.

**Rules:**
- One message and one link per request line, even when two lines share a phone number.
- The same checklist, period and registration cannot be requested twice while one is open. The CA is warned and can open the old one.
- Started from a client page: step 2 is already filled with that client's registrations of the chosen kind.

**Different from today:** today it is clients first, then documents, with no period and no kind. All four steps change.

---

### M5. The client answers (client side)

**Who:** the client. **Starts:** the WhatsApp message.

**The message** (approved template): "Hello Priya Textiles Pvt Ltd (GST Maharashtra). For GST monthly, Sep 2026, please send: Sales register, Purchase register, GSTR-2B, Bank statement. Last date 10 Oct. Upload here: <link>". From the firm's own number it also says "or send them in this chat".

**Two ways to answer:**

| Way | When | What happens |
|---|---|---|
| **Upload link** | Always | Page shows firm name, client, registration, period, each document with its status. Upload one or more files per document, or "I don't have it". Sent-back documents show the reason. No login, no OTP. Link works until the last date plus grace days. |
| **Files on WhatsApp** | Only on the firm's own number | Client just sends files. See M6. |

On the CA Connect number, client replies are not read. The client gets an automatic reply: "Please use the link to upload."

---

### M6. Files that come on WhatsApp (Inbox)

**Who:** CA, staff. **Starts:** a client sends something on the firm's own number.

**Step 1: keep everything.** The firm's own number is a work number, so every chat comes in: messages, photos and files. Files that look like documents are read and added to the client's request.

**Step 2: whose is it?** In this order:

1. The number belongs to one client with one open request line → that line.
2. The file reads as a PAN, GSTIN or TAN that we know → that client and registration.
3. The name on the file matches exactly one client → that client (a guess, shown as "Suggested").
4. Nothing → the file waits.

**Step 3: which document?** The file is read (PAN card, Bank statement, Form 16...) and placed on that document of the open request line, as **To review**.

**What waits, and where:**

| Situation | Where it waits | Who acts |
|---|---|---|
| Known number, document not clear | The client's "Files that need a place" (in the chat side panel and inside the request) | CA picks the document |
| Unknown number | **Unassigned** in the Inbox | CA saves each file for a client, or saves the number as a contact of a client |
| Same file sent twice | Marked "duplicate" | CA removes it |

**Rules:**
- The client is never asked which request a file is for. The CA places it.
- Saving an unknown number as a contact: it is added as one more contact of the client. The client's own number stays.
- Several files at once (three PAN cards for a family) are read and matched one by one.

**Built in the demo:** reading is faked, Unassigned cards, Save for client, Save contact, duplicates. **Not built:** step 3 (ticking the request line from what was read).

---

### M7. Review

**Who:** CA, staff. **Starts:** Dashboard "To review", a request, or the Inbox.

**Request page:** one row per request line: client, registration, progress (3 of 4), status, last message. Open a line to see each document.

**For each document:**
- **Approve:** nothing is sent to the client. The file goes to Document Master.
- **Send back:** pick a reason (not clear, wrong document, pages missing, wrong period) or write one. The client gets the "sent back" message with the reason.
- **Not applicable:** removes it from the checklist.
- **Another file of:** a second file on the same document (front and back).

**A line is complete** when every document is approved or not applicable. The client gets "All documents received" only when the CA presses **Send update**.

---

### M8. Follow-up

**Who:** CA, staff. **Starts:** Dashboard or a request.

| Action | What goes to the client |
|---|---|
| **Remind** (one line or many) | Nothing approved yet: the pending list. Some approved: progress ("2 approved, these are pending"). |
| **Send update** (all done) | "All documents received, thank you." |
| **New link** | A fresh link. The old one stops working. |
| **Change last date** | Nothing by itself. The next reminder shows the new date. |

**Request status:** **Needs review** (a file waits for the CA), **Waiting for clients**, **Completed** (every line complete).

Reminders are manual for now.

---

### M9. Document Master

**Who:** everyone in the firm. **Starts:** Document Master, or a client's Documents tab.

**Structure:**

```
Firm documents/          (the firm's own folders)
Clients/
  Priya Textiles Pvt Ltd/
    FY 2026-27/
      ITR/
      GST · Maharashtra/
        Sep 2026/
      TDS · Head office/
```

- Approved files land here by themselves, in the folder of their client, year, registration and period.
- View, download, download a folder as ZIP.
- The firm can add its own folders and move files.

**Rule (proposed, was parked):** a file remembers whose it is (client, registration, document, period), not only its folder. Deleting or renaming a folder never loses a file: a folder with files asks where they should go first.

**Different from today:** the year is fixed to FY 2025-26, there is no period level, and the kind comes from the request title.

---

### M10. Dashboard (daily work)

**Who:** CA, staff. **Starts:** login.

1. **To review:** request lines with files waiting. Opens the line.
2. **Waiting for clients:** request lines with nothing new. **Remind** from here.
3. **Unassigned files:** count, opens the Inbox.
4. **Due this week** and a calendar of last dates.

The unit is always one request line, never "400 documents".

---

### M11. Settings and WhatsApp

**Who:** Owner, Admin.

- **Firm:** name, logo.
- **Team:** members and roles.
- **WhatsApp:** CA Connect number (always on) and "Connect your own" (through Ramwin, or another provider). The number is chosen per request. Disconnecting asks for consent, and later reminders go from CA Connect.
- **Links:** grace days after the last date (default 7).
- **Message templates:** shown, not edited (they are approved by WhatsApp).
- **Usage:** messages sent this month.

---

## 5. Rules that cut across modules

- **One number, many clients:** every request line has its own message and link. One chat per phone number. Files from a shared number are matched by what they say (M6), never by asking the client.
- **Who gets the message:** the contact of the registration, on WhatsApp only when it is on. Email is a switch only, nothing is emailed yet.
- **Sensitive data:** PAN, Aadhaar and bank statements are personal data. Before the backend: where files are stored, encryption, how long they are kept, who can see them, and whether a file may be sent to an outside AI service for reading. To be decided with the team (see 7).

---

## 6. What has to change in today's app

| Screen | Change |
|---|---|
| Setup › Checklists | Add kind and period type to each checklist. |
| New request | New order: what (checklist + period) → who (registrations of that kind) → documents → send. Duplicate check. |
| Requests list | Show kind and period. Bring back a kind filter (it is reliable now). |
| Request page | Header shows kind, period. Rows are registrations, not clients. |
| Client page | Requests tab reads kind from the request, not guessed. Registrations tab design to be agreed. |
| Inbox | After a file is read, tick the document on the open request line. |
| Document Master | Year from the period, a period level, kind from the request. |
| Messages | Template names the registration and period ("GST Maharashtra, Sep 2026"). |
| Sample data | Contacts are people, not firm names. Requests have kind and period. |

---

## 7. Decisions needed (with a suggestion)

| # | Question | Suggestion |
|---|---|---|
| 1 | Must every checklist have a kind? | Yes. ITR, GST or TDS only (no "Other", decided 27 Oct). |
| 2 | Is the period part of a request? | Yes, picked in step 1. |
| 3 | Registrations tab: plain table or Compliance Tracker tabs? | Agree on a sketch first, then build once. |
| 4 | Same checklist + period + registration asked twice? | Warn and open the old one. Do not block. |
| 5 | Documents already on file (PAN asked every time)? | Still parked. Decide after the model is settled. |
| 6 | Folder delete / rename | A file keeps its identity. A folder with files asks where they go. |
| 7 | Reading files (AI / OCR): which service, and can client files leave our servers? | Decide with the team before the backend. |
| 8 | Requirement v2 says "every KDK record is a separate client". We moved to one client per PAN. | Update the Requirement to the unified model. |

---

## 8. Suggested order of work

1. Agree on this document (sections 2, 4 and 7).
2. Commit today's work in git before changing anything.
3. Build the model change: kind and period on checklist and request (data + Setup).
4. Rebuild New request (M4).
5. Request page, Requests list, Client page Requests tab (M7, M2).
6. Document Master structure (M9).
7. Inbox ticking the request line (M6).
8. Then the backend, starting with one real end-to-end path: request sent → file received on WhatsApp → read → placed → approved → in Document Master.
