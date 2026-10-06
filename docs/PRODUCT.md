# DocCollect: how it works

This is the one place that says how the product behaves. It is kept up to date with every change (see the end of this file).
Everything below runs on sample data in the browser. The backend is not built yet.

## 1. What it is

A CA (or tax practitioner) asks clients for documents on WhatsApp, the clients send them, the CA reviews them, and approved files are kept in Document Master.

- **CA side:** the app (dashboard, clients, requests, inbox, document master, setup).
- **Client side:** an upload link, opened on a phone. No login.
- **Roles in a firm:** Owner, Admin, Staff (Settings > Team).

## 2. The main idea

- **A request is one compliance** (ITR, GST, TDS ...) sent to one or more clients, with a last date.
- **Every client gets their own message and their own link**, even when clients share a phone number.
- A document has a status: `pending`, `to review`, `approved`, `sent back`, or `not applicable`.
- A request is **Needs review** (something waits for the CA), **Waiting for clients**, or **Completed** (everything approved).
- The CA is never asked to look at 400 documents. The unit of work is **one client in one request**.

## 3. Screens (CA side)

| Screen | What it does |
|---|---|
| **Dashboard** | Greeting, work queue (one row per client per request: Review or Remind), calendar of last dates, "Due this week". Remind works only for clients who still owe documents. Clients with documents waiting for review are skipped, and the bar says so. |
| **Clients** | List with search and ITR / GST / TDS filter. A client page has Overview, Requests, Documents, Messages, Activity. Messages shows only that client's own messages. |
| **Requests** | Table: Request, Clients, Sent, Last date, Documents, Status. Filters: search, last date, which number. Header stays in view. A row can expand to show its clients (first five). Under the clients it says how many are to review and how many are late or waiting. |
| **Request page** | One row per client with Review, Remind or Send update. Open a client to see each document, approve or send back, copy or renew the link. Also: change last date, "Remind N clients" (or "Send update to N clients" when all are done). |
| **New request** | Step 1 clients, step 2 checklist and documents, step 3 number, last date and message preview. |
| **Inbox** | WhatsApp chats, grouped by number. Side panel shows the requests of that chat and files that need a place. |
| **Document Master** | Firm folders on top, then one folder per client. Search, "Show more", rename, move, delete, drag and drop. |
| **Setup** | Compliances (saved checklists), Documents list, Message templates, Settings. |

## 4. Messages

Messages come from fixed, WhatsApp-approved templates. The CA does not edit the words.

**When a message is sent**

| Action | Message |
|---|---|
| New request | Document request, one per client. A client with nothing to be asked gets none. |
| Remind / Send update (one client or many) | Some approved and some missing: progress update ("2 approved, these are pending"). Nothing approved yet: pending list. Everything approved: "all documents received". |
| New link | Fresh link message. The old link stops working. |
| Document sent back | The template for the reason chosen (not clear, wrong document, pages missing, wrong year), or a general one with the CA's own words. |
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
- **Review the files** (Inbox side panel or the request): one at a time, search for the document and save. A document that already has a file can take the new one as "another file of" it (front and back of a card, sheets of a workbook).
- **Not for this request:** keep the file in a Document Master folder, or remove it.
- A personal photo or a chat message is not saved. Only files that look like documents, for clients with an open request.

## 7. Same number, many clients

(A father filing for his daughters, one owner with many firms.)

- One phone has one chat per number, shown by the person's name. Each request still gets its own message and link.
- The side panel shows one card per client, with the client's name when the people are different. One person with two kinds of work (ITR and GST) is not split.
- A client's own page shows only that client's messages and files placed with them.
- Files that cannot be matched wait for the CA to place them.
- Sample data: **Ram Sharma** (with Reeta and Seeta) and **Suresh Agarwal** (three firms).

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
- Reading documents automatically (AI / OCR).
- Add and edit client form, KDK sync.
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
