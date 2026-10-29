# Matching a file that arrives on WhatsApp

Status: **a plan, not built, and partly parked.** The main idea (the file decides, the mobile only helps) is agreed. The case where one client (one PAN, GSTIN or TAN) belongs to **more than one CA firm** is **not decided and parked**, so rule 5 below is only a first draft. The demo does not do any of this yet. It says how a file sent on WhatsApp is read and given to the right firm, client and request. It matters most for the **CA Connect number**, which is one number (KDK's own) shared by every firm, so a file can arrive for any of them.

## The idea in one line

**The file decides. The sender's mobile number only helps.**

Anyone can send a file from any phone: a family member sends four PAN cards, an accountant sends a client's papers. So the sender's number says who *sent* it, not whose document it is.

## What decides what

| Question | Decided by | Mobile number |
|---|---|---|
| Which **firm** | The sender's mobile, if it is a contact of that firm. If not, the PAN, GSTIN or TAN in the file, if it matches one firm's client | A hint, the first one tried |
| Which **client** | What is read in the file: PAN, GSTIN, TAN, then name and account number | Only breaks a tie |
| Which **request and document** | The client's open requests and the document type read from the file | Not used |

## How a file is read

Each file is read alone, even when many arrive together. Four PAN cards from one phone are four files and can belong to four clients, each with their own ITR request.

Strength of what is found in the file:

| Found in the file | Strength |
|---|---|
| PAN, GSTIN or TAN | Strong. Points to one client |
| Account number, policy number | Medium |
| Name only (bank statement, masked Aadhaar) | Weak. Names repeat, and spelling differs |

## What happens to the file

1. **Strong match, and that client has an open request that asks for this document:** the file goes into that request as **To review**. The CA still approves it, as for any file.
2. **Strong match, but no open request for it:** the file is kept as **not placed yet** under that client. The client is told, "There is no open request for this right now." Clients often send before a request exists, so the file is not thrown away.
3. **Weak or medium match:** nothing is placed on its own. The CA sees a suggestion, "We think this is...", with the reason, and decides (same as the Inbox today).
4. **No match, or the file could not be read:** the file is **not placed yet** with no client. The CA decides. Nothing is shown to the sender about any client.
5. **Two or more firms match:** the sender is asked which firm it is for, and the answer is used. Until then the file is held and shown to no firm.

The file is never added to a client only because of the sender's number.

## Rules that keep it safe

- **Never tell a sender about a client.** Replies to the sender only say what happened to their file, never names, requests or dates of anyone.
- **Unknown sender:** the files are kept for the CA to check, and the sender gets the upload link. No file from an unknown number is placed on its own.
- **A file is never given to a firm that did not ask for it.** A PAN that matches a client in a firm with no open request for it goes to that firm's "not placed yet", not to another firm.
- **Reading is a guess.** Every placed file stays **To review** until the CA approves it, so a wrong match is caught there.
- **KDK can see files** that arrive on its shared number. Firms are told this in the terms before they use CA Connect.

## What changes in the product when this is built

- CA Connect stops being "replies not read". Settings > WhatsApp and `whatsapp-integration.md` change to match.
- The Inbox shows CA Connect chats with the same "not placed yet" and "We think this is..." parts it has for a firm's own number.
- The auto-reply to a sender (no open request, which firm, send the link) needs approved templates.

## Not decided yet

- A PDF with several people's documents in it (leave out of the first version).
- The exact wording of the "which firm?" question and how long a held file waits.
- How long KDK keeps files that no firm claims.
