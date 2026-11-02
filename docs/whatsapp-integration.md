# WhatsApp integration

How a firm connects its WhatsApp to DocCollect, how a message chooses its number, and what the backend has to do. The screens are built (Settings > WhatsApp) and run on sample data. The real calls come with the backend.

Ramwin is the only way to connect. There is no other provider, and the firm never types an API key.

## Only the firm's own number

**CA Connect (KDK's shared number) is not part of the product.** One WhatsApp number is connected per firm account, so a file that arrives on it belongs to that firm. The screen parts of CA Connect are kept in `frontend/src/parked/caConnect.txt`. The firm must **connect its own WhatsApp first**. The sections below that talk about CA Connect describe how it worked and are not active now.

- **Not connected:** the app works (clients, documents, checklists, reading), but a banner says "Connect your WhatsApp to start sending requests and reminders". Anything that would send (New request, Remind, Send update, new link) opens a dialog with a button to Settings > WhatsApp. Nothing is created or sent.
- **Connected, waiting for WhatsApp to approve the messages:** the banner says so and sending is blocked in the same way. There is **no fallback** to CA Connect.
- **Ready:** at least one template is approved. No banner.
- A document that is sent back is still sent back when WhatsApp is not ready; the client just is not messaged.
- "Delete all data" starts the firm not connected. The sample firm starts connected.

## When a message cannot be sent

These cases are built in the demo. The backend has to give the same behaviour with real WhatsApp (Ramwin) data.

| Case | What the firm sees | What happens |
|---|---|---|
| **Not connected** | Banner under the header, and a dialog on every send, with a button to Settings > WhatsApp | Nothing is sent or created |
| **Connected, templates not approved yet** | Banner "Waiting for WhatsApp to approve your messages"; dialog on send | Nothing is sent |
| **One template not approved** (waiting or rejected) | Dialog "This message is waiting for approval" | Only that message is blocked. The others still go. Settings and the Message templates page show each template as Approved or Pending (a count like "19 of 20 approved", never a list of names). **A template WhatsApp turned down also shows as Pending, with no names and no reason**: templates are KDK's job (KDK fixes the words and sends them again), so the reason and the list are kept for KDK only. The Templates page and Inbox list only approved templates |
| **Connection lost** (WhatsApp logged the number out or blocked it; the firm did not disconnect) | Banner "Your WhatsApp got disconnected", **Disconnected** in Settings with **Connect again**; dialog on send | Nothing is sent. Requests, chats and documents stay. Connecting again starts the template approval again |
| **Client's number is not on WhatsApp** | Toast "Could not send to X: Not on WhatsApp", a red "Not on WhatsApp" next to the client's number in the request, "Not delivered: Not on WhatsApp" under the message in the Inbox chat, and a note on the "Request sent" screen | The reminder is not counted as sent (the "last reminded" time does not change). The backend sets this from WhatsApp's delivery report |
| **A document is sent back while WhatsApp is not ready** (or that message is not approved) | Toast "X rejected. The client was not told, because that message cannot be sent now." | The document is still marked rejected. The client is not messaged |
| **More than 24 hours since the client's last message** | Inbox: typing is locked, with a note. **Templates** lists only approved messages that need nothing but the name, firm and link, and one click sends it as it is | WhatsApp allows free text only within 24 hours of the client's last message. The client writing again opens it for another 24 hours. To remind about documents, use **Remind** on the request (a template) |

In the demo: **Check status** in Settings moves the approval along (7 approved, then all but one with one turned down, then all), the client **Vikram Enterprises** has a number that is not on WhatsApp, and `?demo=1` shows **Demo: connection lost**.

## The two numbers (CA Connect is off for now)

| | CA Connect | Your own number |
|---|---|---|
| Sent from | KDK's shared number, in the firm's name | The firm's own number |
| Setup | None. Always connected, managed by KDK | Connect once through Ramwin |
| Client replies | Read, for the firm's own clients only. See `document-matching.md` | Read. Files are sorted for the CA to check |
| Messages | Approved templates only | Approved templates, plus free text inside 24 hours |

## Choosing the number

- The firm chooses **once, in Settings > WhatsApp** (the tiles, then **Use my number** / **Use CA Connect instead**, which asks to confirm). The choice is kept until the firm changes it.
- The New request step only **shows** which number it goes from, with a link to Settings. Reminders and later messages use the same choice.
- Switching back to CA Connect keeps the own number connected. Only **Disconnect** removes it.
- **Template approval:** WhatsApp approves each message template before it can be sent from the firm's own number. Until a template is approved, that message goes from CA Connect (as a link). Connecting a new number starts with no template approved. There are 20 ready messages (one more than before: the message for an optional document that was sent back). Settings shows "Waiting for approval", then "n of 20 approved", then "All approved".

## What we found out (so we do not promise the wrong thing)

1. **Three different things share the name "WhatsApp".** Normal WhatsApp. The WhatsApp **Business app** (the free phone app). The WhatsApp Business **Platform** (the API, through a provider). Only the third can send messages at scale.
2. **A number on normal WhatsApp cannot be connected as it is.** It must either be moved to the Business app first, or a new number is used. Deleting WhatsApp on it works, but loses every chat.
3. **A number on the Business app can sometimes keep working next to the API** ("coexistence"). Requirements from Meta: Business app version 2.24.17 or newer, the number in use on the app for a while (providers say at least 7 days), and the person must be an admin of the Meta business portfolio. Throughput is capped at 20 messages a second. Whether this is allowed in **India** is unclear: provider documents disagree, and Meta's own page does not list countries. So the screen never promises it. It says "if WhatsApp allows it for your number", and the provider tells the firm before anything changes.
4. **New accounts can message 250 new clients a day** until the business is verified with Meta. The limit then rises in steps (1,000, 10,000, 100,000, unlimited). Replies inside the 24-hour window are not counted. This matters for a CA who sends one request to thousands of clients, so the Settings card shows the limit and nudges the firm to verify.
5. **The business name clients see (display name) must match the business** and is reviewed by WhatsApp. Sending can start while it is in review.
6. **Free text is only allowed within 24 hours of the client's last message.** Outside that, only approved templates.
7. Ramwin is not documented anywhere we could find publicly. Its exact steps and API need to be confirmed with Ramwin before the backend is written.
8. Points 1 to 3 and 5 are about linking the number, which now happens on Ramwin's own page, not in our screens.

## The connect flow (through Ramwin)

1. In Settings > WhatsApp, the firm opens **Your own number** and presses **Connect your own WhatsApp**.
2. The browser goes to Ramwin's page. The firm links its number there (verification, Meta business, display name, channel). The firm does not copy anything.
3. Ramwin sends **Channel ID** and **API key** to our backend (the firm never sees them), and the firm returns to Settings. We show the number and the name clients see.
4. Our backend submits the message templates to WhatsApp for approval and keeps checking their status.
5. A message goes from the own number only when its template is approved and the firm has chosen its own number.

**Disconnect** asks first. After it, reminders of requests that were sent from the own number go from CA Connect, as a link. Old chats stay readable.

In the demo, the Ramwin page is a stand-in screen at `/ramwin` (the real address is set with `VITE_RAMWIN_CONNECT_URL`), the Channel ID is made up, and **Check status** moves the template approval one step.

## What the backend must store per firm

`number`, `display_name`, `provider` (Ramwin), `channel_id`, encrypted `api_key`, `connected_at`, `send_from` (own | kdk), the approval status of each template, `business_verified`, `daily_limit`. The Channel ID and API key are kept for the backend and are not shown on screen.

The backend also has to: receive client messages and delivery status from Ramwin, tell the firm's own number from CA Connect, and (for CA Connect) match files to the right firm and client as in `document-matching.md`.

## Open questions

- Ramwin's real onboarding steps and API, and how it sends the Channel ID and API key back.
- How Ramwin reports template approval (all at once, or one by one).
- Is coexistence available in India for our users?
- Who does Meta Business Verification for the firm, and what documents does it need?

## Sources

- Meta, [Onboarding WhatsApp Business app users (coexistence)](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users)
- 8x8, [WhatsApp Business app coexistence](https://developer.8x8.com/connect/docs/whatsapp/whatsapp-business-app-coexistence)
- 360dialog, [Coexistence onboarding](https://docs.360dialog.com/docs/hub/embedded-signup/coexistence-onboarding)
- Exotel, [WhatsApp number requirements](https://developer.exotel.com/docs/whatsapp-support/number-requirements)
- Webhook Relay, [WhatsApp Cloud API webhooks](https://webhookrelay.com/blog/whatsapp-cloud-api-webhooks/)
- AiSensy, [WhatsApp message limits in 2026](https://m.aisensy.com/blog/whatsapp-message-limits-guide/)
- Chakra HQ, [Coexistence FAQs](https://help.chakrahq.com/chat/faqs/coexistence-faqs)
