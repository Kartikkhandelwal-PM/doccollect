# WhatsApp integration

How a firm connects its WhatsApp to DocCollect, what we found out while planning it, and what the backend has to do. The screens are built (Settings > WhatsApp > Connect your WhatsApp). They run on sample data. The real calls come with the backend.

## The two ways messages go out

| | DocCollect number | Your own WhatsApp |
|---|---|---|
| Sent from | KDK's shared number, on behalf of the firm | The firm's own number |
| Setup | None | Connect once (below) |
| Client replies | Not read. Clients use the upload link | Read. Files are sorted for the CA to check |
| Messages | Approved templates only | Approved templates, plus free text inside 24 hours |

## What we found out (so we do not promise the wrong thing)

1. **Three different things share the name "WhatsApp".** Normal WhatsApp. The WhatsApp **Business app** (the free phone app). The WhatsApp Business **Platform** (the API, through a provider). Only the third can send messages at scale.
2. **A number on normal WhatsApp cannot be connected as it is.** It must either be moved to the Business app first, or a new number is used. Deleting WhatsApp on it works, but loses every chat.
3. **A number on the Business app can sometimes keep working next to the API** ("coexistence"). Requirements from Meta: Business app version 2.24.17 or newer, the number in use on the app for a while (providers say at least 7 days), and the person must be an admin of the Meta business portfolio. Throughput is capped at 20 messages a second. Whether this is allowed in **India** is unclear: provider documents disagree, and Meta's own page does not list countries. So the screen never promises it. It says "if WhatsApp allows it for your number", and the provider tells the firm before anything changes.
4. **New accounts can message 250 new clients a day** until the business is verified with Meta. The limit then rises in steps (1,000, 10,000, 100,000, unlimited). Replies inside the 24-hour window are not counted. This matters for a CA who sends one request to thousands of clients, so the Settings card shows the limit and nudges the firm to verify.
5. **The business name clients see (display name) must match the business** and is reviewed by WhatsApp. Sending can start while it is in review.
6. **Free text is only allowed within 24 hours of the client's last message.** Outside that, only approved templates.
7. Ramwin is not documented anywhere we could find publicly. Its exact steps and API need to be confirmed with Ramwin before the backend is written.

## Flow A: through Ramwin (we set it up)

1. **Which WhatsApp is on the number?** WhatsApp Business app, normal WhatsApp, none yet, or "I already have an API account".
2. *Normal WhatsApp only:* explain the one change needed (new number, or switch to the Business app first).
3. **Number and name.** Number, display name, "work number only", terms.
4. **Verify.** A 6-digit code by SMS or call (or shown in the Business app).
5. **Channel.** Facebook login, create or pick the Meta business portfolio, create the WhatsApp Business account, add the number, submit the display name, create the channel. Result: a **Channel ID**.
6. **Test message.** Sent to the firm's own phone with an approved test template. The firm confirms it arrived.
7. **Connected.** Number, name and review status, Channel ID, test result, daily limit.

## Flow B: the firm already has another provider (BSP)

We ask for exactly what an integration needs:

| Ask | Why |
|---|---|
| Provider (Gupshup, Interakt, WATI, AiSensy, Twilio, 360dialog, Meta Cloud API, other) | Which API shape to use |
| WhatsApp number | The sender |
| Channel / sender ID (often the Phone Number ID) | Which number to send from |
| API key or access token (permanent, not the 24-hour test token) | To send. Stored encrypted. Never shown again |
| One approved template name and language | For the test message |
| **Webhook URL and verify token** (we give these to the firm) | The provider sends client messages and delivery status to us |

Webhook handshake (Meta style): the provider sends a GET with `hub.mode=subscribe`, `hub.verify_token` and `hub.challenge`. If the token matches, we answer 200 with the challenge. The URL must be public HTTPS and answer within a few seconds. The firm turns on "messages" and "message status" events. The screen has a **Check connection** button.

## What the backend must store per firm

`number`, `display_name`, `display_name_status` (review | approved), `provider`, `route` (ramwin | provider), `channel_id`, encrypted `api_key`, `webhook_secret`, `tested_at`, `daily_limit`, `business_verified`.

## Open questions

- Ramwin's real onboarding steps and API.
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
