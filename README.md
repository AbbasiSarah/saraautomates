# Sara Automates

Website for **Sara Automates** — appointment booking, reminders, patient enquiries and staff handover for private clinics in the UAE and UK.

**Live site:** https://saraautomates.com

## Pages

| Page | What it covers |
|---|---|
| `index.html` | Home page with the patient-phone and reception-calendar demo |
| `solutions.html` | The four workflows, integrations, how we work, pricing and FAQs |
| `demo.html` | Full interactive demo (fictional clinic, nothing is sent anywhere) |
| `uae.html` | WhatsApp booking in English and Arabic for UAE clinics |
| `uk.html` | Online booking with SMS and email reminders for UK practices |
| `book.html` | "Book a clinic demo" form |
| `privacy.html` | Security & privacy |

## How it is built

- Static HTML, CSS and JavaScript, hosted on GitHub Pages with a custom domain (`CNAME`).
- No frameworks, no tracking cookies, and a strict Content Security Policy on every page.
- `assets/js/config.js` holds the settings: the demo-form endpoint, the contact email and the chat endpoints.
- `assets/js/chat.js` is the **Ask Sara Automates** chat. It answers from the approved answers in the file; it can also send questions to an AI agent running on Google Apps Script when `CHAT_ENDPOINT` is set in `config.js`.
- The demo form and the chat backend run on Google Apps Script; their scripts are kept outside this repository.

## Editing

- To change a chat answer, edit the `FAQ` list near the top of `assets/js/chat.js`.
- To change contact details or endpoints, edit `assets/js/config.js`.

---

© 2026 Sara Abbasi. All rights reserved. This code may not be copied, modified or reused without written permission.
