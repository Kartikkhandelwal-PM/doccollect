# DocCollect: how it works

This is the one place that says how the product behaves. It is kept up to date with every change (see the end of this file).
Everything below runs on sample data in the browser. The backend is not built yet.

## 1. What it is

A CA (or tax practitioner) asks clients for documents on WhatsApp, the clients send them, the CA reviews them, and approved files are kept in Document Master.

- **CA side:** the app (dashboard, clients, requests, inbox, document master, setup).
- **Client side:** an upload link, opened on a phone. No login.
- **Roles in a firm:** Owner, Admin, Staff (Settings > Team).

## 2. The main idea

- **A request is one checklist** (a saved list of documents used for Income tax, GST or TDS) sent to one or more registrations of that kind, with a last date. Documents are not tied to a kind: PAN, Aadhaar or a bank statement can be in any checklist. "Income tax" covers everything filed on the PAN (ROC, KYC and the like).
- **Every client gets their own message and their own link**, even when clients share a phone number.
- A document has a status: `pending`, `to review`, `approved`, `rejected`, or `not applicable`.
- A request is **Needs review** (something waits for the CA), **Waiting for clients**, or **Completed** (everything approved).
- The CA is never asked to look at 400 documents. The unit of work is **one client in one request**.

## 3. Screens (CA side)

| Screen | What it does |
|---|---|
| **Dashboard** | Greeting, work queue (one row per client per request: Review or Remind), calendar of last dates, "Due this week". Remind works only for clients who still owe documents. Clients with documents waiting for review are skipped, and the bar says so. |
| **Clients** | List with search and ITR / GST / TDS filter. A client page has Overview, Requests, Documents, Messages, Activity. Messages shows only that client's own messages. |
| **Requests** | Table: Request, Clients, Sent, Last date, Documents, Status. Filters: search, last date, which number. Header stays in view. A row can expand to show its clients (first five). Under the clients it says how many are to review and how many are late or waiting. |
| **Request page** | One row per client with Review, Remind or Send update. Open a client to see each document, approve or reject, copy or renew the link. Also: change last date, "Remind N clients" (or "Send update to N clients" when all are done). |
| **New request** | Three steps: **What you need** (Income tax, GST or TDS, then a checklist for it, then tick or add documents), **Who to ask** (only registrations of that kind, with search and Select all), **Review and send** (send from, last date, send). A summary with a message preview stays on the right. |
| **Inbox** | WhatsApp chats, grouped by number. Side panel shows the requests of that chat and files that need a place. |
| **Document Master** | Firm folders on top, then one folder per client. Search, "Show more", rename, move, delete, drag and drop. |
| **Setup** | Checklists (saved lists of documents, each "used for" Income tax, GST or TDS), Documents, Message templates, Settings. |

## 4. Messages

Messages come from fixed, WhatsApp-approved templates. The CA does not edit the words.

**When a message is sent**

| Action | Message |
|---|---|
| New request | Document request, one per client. A client with nothing to be asked gets none. |
| Remind / Send update (one client or many) | Some approved and some missing: progress update ("2 approved, these are pending"). Nothing approved yet: pending list. Everything approved: "all documents received". |
| New link | Fresh link message. The old link stops working. |
| Document rejected | The template for the reason chosen (not clear, wrong document, pages missing, wrong year), or a general one with the CA's own words. |
| Approve one document | **Nothing is sent.** |
| First message from another number | A short introduction goes first, once. |

**Wording**

- From the firm's own number: "send them here in this chat", and the link is only an option.
- From the CA Connect number: link only, because replies are not read there.
- The greeting uses the client's full name or firm name ("Hello Reeta Sharma"), so it is clear when one phone gets messages for several people.
- Every message that goes out also appears in that client's Inbox chat.

## 5. WhatsApp numbers

Two numbers can work at the same time.

- **Your own WhatsApp:** connected in Settings. Client replies and files are read and land in the Inbox.
- **CA Connect number:** KDK's shared number, always available. Messages go in the firm's name. Client replies are **not** read. A client who writes there anyway should get an automatic reply asking them to use the link (written in the Inbox as a note; the real auto-reply comes with the backend).

**Rules**

- The number is chosen per request ("Send from"). Reminders for that request go from the same number.
- The default is the number connected in Settings. If your own is not connected, CA Connect is used and "Your WhatsApp" is shown as not connected.
- **Disconnecting** your own number asks for consent. After that, reminders of requests that were sent from it go from CA Connect, as a link. Old chats stay readable but nothing can be sent from them.
- The Inbox keeps a separate list of chats for each number. The same client can have a chat on both.
- The name shown for your number is the WhatsApp display name, with the number under it.

## 6. Files from clients

- A file is matched to a document by its name. If it cannot be matched it waits in "Not placed yet", for that phone number.
- **Files nobody asked for, and many at once:** any file on the firm's own number is read (type, name, PAN / account number). In Unassigned, every file gets its own card with a guess of the client (PAN match is surest, then name) and a "Save for client" button; "Save all matched" does the lot. A repeat of the same document is flagged as a duplicate. If we cannot tell, it waits for staff. We never ask the client.
- **Save the contact:** in Unassigned, tap the unsaved number at the top of the chat. Enter a name and pick the client (name and PAN shown). The number is saved as an extra contact (the client's own number stays). Later files from it land in that client's chat. Files still waiting move to "files that need a place".
- **A file with no document:** open it in the chat. Attach it to a pending document of an open request (a suggestion from what the file was read as is on top; with several requests the CA picks the request first), or save it to a folder with no request (the folder is chosen from what the file was read as, and can be changed).
- **Approving a document:** asks where to keep it in Document Master. The suggested folder (client, year, kind of work) is already chosen. The CA can approve and save there, approve without saving (it then waits at the top level of Document Master as "Not in a folder yet", and can be saved later from the preview), or cancel. Nothing is filed without that answer. Deleting a folder the CA made does not delete approved documents in it.
- **More than one file for a document:** only if the document allows it (the checkbox "Allow more than one file" on the Documents page; a few such as Aadhaar and bank statements start with it on). A several-files document takes new files as more files of it; a one-file document takes a new file in place of the old one. The same rule is on the client's upload page.
- **Files that cannot be shown:** PDF and images open in the preview. Anything else (Excel, Word, ZIP, HEIC) shows a card with a Download button instead; the CA downloads it, looks, and still approves or rejects in the app. A document may be several files; the preview has a chip for each.
- **A document with no request:** the client may send a file when the CA has asked for nothing. Open it in the chat and either save it in a folder (Save-as window), or start a request with it (New request opens for that client, and the file goes on its document when the request is sent).
- **Wrong match:** if the AI put a file on the wrong document, open its preview in the Inbox and use "Wrong document?": move it to another document of the request (two files swap if needed) or take it off the checklist (it goes back to waiting). Approving is always the CA's step.
- **Review the files** (Inbox side panel): one at a time, choose the request and the document, or save it in a folder. A document that already has a file takes the new one as "another file of" it only if the document allows several files (front and back of a card, sheets of a workbook); otherwise the new file replaces the old one.
- **Not for this request:** keep the file in a Document Master folder, or remove it.
- A personal photo or a chat message is not saved. Only files that look like documents, for clients with an open request.

## 7. One client, many registrations

The Client Master is **unified**, same shape as KDK Compliance Tracker: one client per PAN.

- A client has **registrations** (each GSTIN, each TAN, and the PAN for ITR) and **contacts** (name, number, who is the main contact, which registration each looks after).
- A firm with two GSTINs (e.g. Priya Textiles: Maharashtra and Karnataka) is one client in the list, with a chip per registration.
- **A request is made per registration.** Each GSTIN/TAN gets its own line, checklist and message, sent to that registration's contact. ITR goes on the PAN.
- The Clients list is a table, one row per client, with filters (Income tax / GST / TDS, open requests) and search. All clients come from KDK; adding by hand is parked.
- **Client page** has four tabs: **Overview, Registrations, Requests, Documents**. Chat is the "Open chat" button; there is no Messages or Activity tab.
  - **Overview:** three small cards (Income tax, GST, TDS). The whole card is one button: it opens Registrations. The open and overdue counts on it are plain text; then the open requests as a table, recent documents and the **main contact** only (name, mobile, email, and a **Change** button: pick another contact of the client, add a new one or edit one. Registrations that have no contact of their own follow the main contact). The full list of contacts is not shown on the Overview, because a client can have many.
  - **Registrations:** the client drawn as a tree, read left to right (same as Compliance Tracker's Structure view): the client (name, PAN), then Income tax / GST / TDS (one colour each), then each GSTIN or TAN with its place, number, contact ("Main contact" when it is the client's own, otherwise the name) and "N open" when it has open requests. A kind the client does not have shows as a dashed card. Clicking a registration opens a side panel with its contact (**Change contact**), the WhatsApp and Email switches, and "See requests". On a phone the tree reads top to bottom.
  - **Requests:** Income tax / GST / TDS buttons (All, Income tax, GST, TDS, with counts), a Registration dropdown, status (open, overdue, completed) and search. A line says "Showing X of Y requests" with Clear filters. One row per request and registration (request, registration, documents done, status, due); the whole row opens it. Paged.
  - **Documents:** the client's folders in the Document Master.
- Every registration can have its **own contact** (a second GSTIN or TAN usually has its own person at that branch). **Change** on a row lists all contacts of the client with the registrations each one handles: pick one (for example the Maharashtra contact for Rajasthan), add a new one by hand, or **Edit** one (editing changes it for every registration that uses it). Switches follow Client Communication Settings: no mobile number means WhatsApp cannot be on, no email means email cannot be on. A request message goes to that registration's contact, and only when WhatsApp is on. Email is only a switch for now, no email is sent.
- When two clients share a contact (a father filing for daughters, an owner with many firms), the page says so. One phone has one chat per number, and each request still gets its own message and link.
- Files that cannot be matched wait for the CA to place them.
- Document Master: one folder per client, then year, then registration.
- Sample data: **Ramesh Kumar** (ITR + GST), **Priya Textiles** (two GSTINs), **Ram Sharma** and **Suresh Agarwal** (many people / firms on one number).

## 8. Documents we already have

**For now every document is asked every time.** A client who already sent a PAN card in an earlier request is asked for it again.

This was tried ("On file": PAN, Aadhaar and similar are kept and not asked again) and taken out. Nobody is sure which documents never change, and the first ideas (a fixed list, a switch per document) did not feel right. How to handle it is **still to be decided**.

## 9. Links

- Link format: `<domain>/u/r-1042-ramesh-itr-v1` (request number, client, version). A new link raises the version and switches the old one off.
- A link works until the last date plus the grace days (Settings > Links, default 7).
- The client page shows what is asked, what is done, and lets them upload several files per document or say "I don't have it".
- The domain `doccollect.in` is a placeholder. In the demo, links open inside this app.

## 10. Demo data and behaviour

- Dates of the sample requests move with today, so the demo always has late, today and upcoming ones.
- Data survives a refresh in the same browser tab. The logo (sidebar, or "More" on a phone) reloads and starts again from the sample data.
- Delivered / read marks and the usage numbers are sample until the backend exists.
- **Parked, not in the app:** the day / night sky on the Dashboard greeting (branch `parked/dashboard-sky`).

## 11. Look and feel

- Light UI, teal accent (#0B7A6B), font Instrument Sans.
- **Phone:** bottom tab bar (Home, Requests, Inbox, Clients, More). Tables become cards. A chat opens full screen. The app can be added to the home screen (manifest and icons).
- **Tablet:** slim sidebar. Tables become cards when the area is too narrow.
- **Laptop:** full sidebar, tables.
- Small motion (Framer Motion) for page changes, lists, dialogs, toast, progress bars. It is off for people who ask for less motion.

## 12. Tech

- Vite, React 19, TypeScript, Tailwind 4, react-router, lucide-react, Framer Motion.
- State lives in React stores (setup, requests, inbox, master), kept per tab in session storage.
- `frontend/` is the app, `backend/` is empty, `docs/` is this. Built and published to GitHub Pages by `.github/workflows/deploy.yml`.

## 13. Not built yet

- Backend, database, file storage, real login.
- Real WhatsApp (provider, templates approval, delivery and read marks, the 250 new clients per day limit on a new account).
- Real AI / OCR. The Inbox already shows what a file was "read" as (demo data), but nothing is really read yet. Ticking the checklist from what is read is also not built.
- KDK sync (real). All clients come from KDK.
- Parked: adding or editing a client by hand. For now every client comes from KDK only.
- Real domain for upload links.

## 14. Decisions taken

- No bulk approve on the Dashboard.
- The client is never asked which request a file belongs to. The CA places it.
- Every document is asked every time for now (see section 8). Reusing an older copy is to be decided later.
- The Requests table has no Type filter, because the type of a request is not reliable.
- Keep things simple. Add a feature only when it is clearly needed.

---

## Keeping this file up to date

Every time something changes in how the product works, update this file in the same change and add a line in `CHANGELOG.md`.

## A file arrives: what happens (all cases)

| Case | What happens |
|---|---|
| Client known, request open, file fits one pending document by number | Put on that document by itself ("To review"). The CA still approves. |
| Same, but only a name matched, or it fits more than one place | The chat asks: "Looks like <document>" with Place it / Not this. Nothing is filed until the CA says. |
| Client known, **no request raised** | The file waits ("Not placed yet"). Preview: Save in a folder (main) or Start a request with it. |
| Client has a request, file comes from an **unknown number** | It goes to Unassigned and is never filed by itself (the number is not proven). The preview says "For <client>" (amber "Check client" if only the name matched) and offers the document and the two buttons. The CA can also save the number as the client's contact. |
| Unknown number, nothing could be read or no client guessed | The preview says it could not tell whose file it is. The CA saves it in a folder (any client) or saves the contact first. |
| Number belongs to several clients, or several requests are open | The request list names the client in each title; the CA picks the request, then the document. |
| AI could not match (or got it wrong) | The CA uses "Add to a request…" (request, then document) or, if already placed, "Wrong document?" to move or take it off. |
| File looks like another client's | Amber line: "This file looks like <client>'s … not <chat>'s. Check before adding it." |
| Same document sent twice | Amber line "may be a duplicate". A second file for a document already waiting is added as another file of it. |
| Not a document (a photo) | Skipped, with a note in the chat. Nothing is saved. |
| Start a request from the file | New request opens for that client; the file goes on its document when sent. If the checklist has no such document, one is added. |
