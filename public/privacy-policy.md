# Privacy Policy

**Last updated: [DATE]**

## Before you read this
This policy describes how **Eugene Odhiambo** ("we," "us," "our") operating **PawVoice** ("the Service") collects, uses, and shares information. It is written to match what the Service actually does. It is **not legal advice**; have it reviewed by a lawyer before launch, especially the recording-consent and international-transfer sections.

---

## 1. Who this policy covers

This Privacy Policy applies to anyone who creates a PawVoice account, links a pet, or calls our phone number.

## 2. Information we collect

**Identity & account information**
- Email address, name, and account role (owner or sitter).
- Phone number, in international (E.164) format.
  - *Known limitation:* as of this build, phone numbers are trusted at registration and are **not verified with a one-time code (OTP)**. Someone could register a number they don't control. We disclose this so you understand the current identity-assurance level. We plan to add OTP verification.

**Pet information**
- Pet name, species, breed, age, and any notes you or a linked user add.

**Voice call & activity log data**
- When you call our number: your caller phone number, call duration, and the call recording/transcript.
- The structured activity log extracted from your call: which pet, activity type, duration, and your notes as spoken (captured as close to verbatim as reasonably possible).
- Records of each call session and usage (for billing and service-quality purposes).
- If other people speak during your call, their voices may be captured in the recording/transcript.

**Payment information**
- Your email address, payment amount, currency, and payment status.
- We do **not** store your full card number or banking credentials — those are handled directly by our payment processor.

**Sharing & invitations**
- Email addresses of people you invite to a pet record.
- Access tokens/links used for view-only sharing.

## 3. How we use this information

- To operate the core Service: answering your calls, converting speech to structured logs, and displaying them to you and people you've linked to a pet.
- To identify you when you call, based on your registered phone number.
- To bill pay-as-you-go usage, process auto-refills, and manage your credit balance.
- To let you invite, and be invited by, other users to share a pet's records.
- To monitor and improve service quality and reliability (aggregate usage patterns, error rates).
- To communicate with you about your account, billing, or changes to this policy.

**We do not use your data to train our own AI models. We do not sell your personal information.**

## 4. AI processing and call recording

Calls to PawVoice are recorded and processed by AI voice and language models to extract structured log entries from what you say. **This is disclosed verbally at the start of every call** (the assistant states the call is recorded and processed by AI before you speak). By continuing the call after that disclosure, you consent to this recording and processing. If you do not consent, end the call.

Your call audio and transcripts are processed by our voice AI infrastructure provider, **Vapi**, and its underlying model and speech-transcription sub-providers (OpenAI for extraction, Deepgram for transcription). See Section 5.

**Data retention by our voice provider (ZDR: ON).** We have enabled **Zero Data Retention (ZDR)** on our Vapi organization. With ZDR active, Vapi does **not** retain call recordings, transcripts, messages, summaries, or structured outputs after a call ends — it processes them in real time and discards them. Vapi retains only operational metadata (call history, cost, latency) needed for billing and the dashboard. [Operator: confirm ZDR shows as enabled in the Vapi Dashboard (Settings → Add-ons) before publishing; ZDR is a dashboard add-on, not a code setting.]

## 5. Who we share information with (our processors)

We use the following third-party services to operate PawVoice. Each processes a limited slice of your information solely to provide their part of the Service:

| Provider | What they process | Purpose |
|---|---|---|
| **Vapi** | Call audio, phone numbers, call metadata | Telephony and voice AI orchestration (ZDR-enabled) |
| **OpenAI** (via Vapi) | Call transcripts | Extracting structured activity data from what you say |
| **Deepgram** (via Vapi) | Call audio | Speech-to-text transcription |
| **Creem** | Email, payment amount, payment status | Payment processing, checkout, and billing |
| **Convex** | All account, pet, and log data | Application database and hosting |
| **Resend** | Email address | Sending account verification and invite emails |

We may add or change providers as the Service evolves; material changes will be reflected here.

## 6. Data retention

- We retain your account, pet, and log data for as long as your account is active.
- Our default is to delete inactive account data **24 months** after the most recent activity, unless you delete it sooner.
- Call audio/transcripts are not retained by our voice provider (ZDR: ON).
- **You can delete your account and all associated data yourself, at any time, from Settings → Delete account.** This permanently removes your profile, the pets you own, activity logs, call history, and payment records. You may also request deletion by contacting **gntulu@gmail.com**. We act on deletion requests within a reasonable time (recommended: **30 days**), except where we must retain certain records (e.g., payment records) for legal or accounting purposes.

## 7. Your rights

Depending on where you live, you may have rights to access, correct, export, or delete your personal information, and to object to or restrict certain processing, including under the EU/UK GDPR and US state privacy laws (e.g., CCPA) where they apply to you.

To exercise these rights, use the in-app deletion flow or contact us at **gntulu@gmail.com**. We'll respond within a reasonable time and may verify your identity first.

## 8. International data transfers

We are based in **Kenya**, and several providers (Section 5) are based in, or process data in, the United States. Your information may be transferred to and processed in countries other than your own, with different data-protection laws. By using the Service, you understand and accept this. [If you serve EU/UK users, add the specific transfer mechanism (e.g., Standard Contractual Clauses) here after legal review.]

## 9. Cookies and tracking

We use only the cookies and local storage strictly necessary to keep you logged in and run the Service (set by our authentication provider, Better Auth). We do **not** use third-party advertising or analytics cookies, and we do not run visitor-tracking scripts.

## 10. Children's privacy

The Service is not directed at, and not intended for, anyone under 18. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact **gntulu@gmail.com** and we will delete it.

## 11. Security

We take reasonable measures to protect your information, but no transmission or storage method is completely secure, and we cannot guarantee absolute security.

## 12. Changes to this policy

We may update this Privacy Policy from time to time. Material changes will be communicated to you (e.g., by email) before they take effect.

## 13. Contact

Questions or data-rights requests: **gntulu@gmail.com**
