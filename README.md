# Chatbot NLP Error Monitoring and Feedback System

## 1. What is this system?

This system monitors an AI support chatbot. It records every conversation,
detects NLP errors in chatbot replies, collects customer ratings, and manages
escalations to human agents. The system also gives staff a dashboard to review
errors, handle complaints and generate reports.

The name of the system in the project documentation is "Chatbot NLP Error
Monitoring and Feedback System". The system follows the design in Chapter Two
of the project documentation.

## 2. The screens

The system has eight screens. All screens from the design document are built.

| # | Screen | User | Address |
|---|--------|------|---------|
| 1 | Login page | Administrator / support agent | `/sign-in` |
| 2 | Customer chat interface | Customer | `/chat` |
| 3 | Escalation request and status | Customer | `/chat` (dialog) and `/status` |
| 4 | Admin dashboard | Administrator / support agent | `/admin` |
| 5 | Flagged conversations | Administrator / support agent | `/admin/flagged` |
| 6 | Customer feedback | Administrator / support agent | `/admin/feedback` |
| 7 | Complaints and escalations | Administrator / support agent | `/admin/complaints` |
| 8 | Reports | Administrator / support agent | `/admin/reports` |

## 3. How the system works

### Customer side (no login)

1. The customer opens `/chat` and sends a message.
2. The server creates an anonymous session and a session code. No personal
   data is stored.
3. The chatbot generates a reply. When `OPENROUTER_API_KEY` is set, the
   reply comes from OpenRouter. Otherwise, the built-in rule engine replies.
4. The NLP error detector analyses the reply and saves any flags.
5. The customer rates the reply with stars, adds a comment, or escalates the
   problem to a human agent.
6. The customer checks the ticket status on `/status` with the ticket number.

### Detection rules

The detector uses three rules. The rules come from the design document.

| Rule | Condition | Error type |
|------|-----------|------------|
| Repetitive | Cosine similarity to an earlier bot reply is 0.85 or more | Repetitive |
| Irrelevant | Cosine similarity to the customer message is less than 0.20 | Irrelevant |
| Fallback phrase | The reply contains a phrase such as "Sorry, I did not understand" | Misinterpreted |
| Re-ask | The customer repeats the last question (similarity 0.80 or more) | Misinterpreted (sets the previous bot reply) |

A reply can raise more than one flag. Every flag stores a confidence score
between 0.00 and 1.00.

You can change the thresholds in `src/lib/constants.ts`.

### Staff side (Clerk login)

- Staff sign in on `/sign-in`. Clerk protects every `/admin` page.
- The dashboard shows total conversations, error counts, the average
  satisfaction, open escalations, error trends and recent activity.
- Staff review flagged replies, assign agents to tickets, update ticket
  status, record resolution notes and export reports.

## 4. Technology

| Technology | Job in this project |
|------------|---------------------|
| Next.js 16 (App Router) | Frontend pages, server pages, API routes and server actions |
| Clerk | Staff authentication and staff user list |
| Supabase (PostgreSQL) | All data storage |
| OpenRouter | Optional AI replies. The rule engine is the fallback. |
| Tailwind CSS | Styling |
| Recharts | Charts on the dashboard and the reports |
| Vercel | Hosting |

## 5. Repository layout

```
src/app/            Pages and API routes
src/app/chat/       Customer chat page
src/app/status/     Ticket status page
src/app/admin/      Staff pages (dashboard, flagged, feedback, complaints, reports)
src/app/api/        API routes (chat, feedback, escalations, exports)
src/components/     Reusable interface components
src/lib/            Core logic (NLP detector, chatbot engine, OpenRouter client, queries, reports)
src/proxy.ts        Clerk middleware. Runs before each request.
src/app/admin/layout.tsx  Staff area guard. Calls auth.protect().
supabase/schema.sql Database schema. Run this file in Supabase.
.env.example        List of the environment variables
```

## 6. Environment variables

The system needs four required environment variables. Keep them in
`.env.local` for local use. Add the same variables in Vercel for the
deployment.

The AI chatbot also uses two optional OpenRouter variables. Without them, the
chatbot uses the rule-based demo replies.

| Variable | Example | Where used |
|----------|---------|------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Browser and server. Clerk frontend key. |
| `CLERK_SECRET_KEY` | `sk_test_...` | Server only. Clerk backend key. |
| `SUPABASE_URL` | `https://abcd.supabase.co` | Server only. Database address. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Server only. Database full-access key. |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Server only. Optional. Enables AI replies. |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Server only. Optional. Model ID. |

You can also set these four optional Clerk route values. The defaults are
shown here.

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Staff sign-in page. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Staff sign-up page. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/admin` | Page after sign-in. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/admin` | Page after sign-up. |

### Optional: connect the OpenRouter chatbot

The chatbot works without OpenRouter. It uses the rule-based demo replies.
To use a real model, follow these steps.

1. Open https://openrouter.ai in your browser.
2. Sign in. You can use Google, GitHub or an email address.
3. Open https://openrouter.ai/keys.
4. Select "Create Key".
5. Enter a name, for example `chatbot-monitor`.
6. Optional: set a credit limit for this key.
7. Select "Create". Copy the key. The key starts with `sk-or-v1-`.
8. Add credits at https://openrouter.ai/settings/credits, or choose a free
   model. OpenRouter charges for each token.
9. Put the key in `.env.local`:

   ```dotenv
   OPENROUTER_API_KEY=sk-or-v1-...
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```

10. Restart `npm run dev`.
11. Add the same two variables in Vercel. Use the "Secret" type for
    `OPENROUTER_API_KEY` and the "Plain" type for `OPENROUTER_MODEL`.
    Redeploy the project.

The default model is `openai/gpt-4o-mini`. To use another model, copy its ID
from https://openrouter.ai/models into `OPENROUTER_MODEL`.

If the key is missing, the model is unavailable, or the request fails, the
chatbot uses the rule-based replies. The customer does not see an error. The
OpenRouter request has a 10-second timeout.

Warning: `OPENROUTER_API_KEY` is a server secret. Never use the
`NEXT_PUBLIC_` prefix. Never commit `.env.local`.

Warning: the service role key bypasses all database security rules. Never put
this key in client code. Never use the `NEXT_PUBLIC_` prefix for it.

## 7. Step-by-step: create the Supabase database

1. Open https://supabase.com in your browser.
2. Select "Start your project" and create an account. You can sign in with
   GitHub.
3. Select "New project".
4. Enter a project name, for example `chatbot-monitor`.
5. Enter a database password. Store the password in a safe place.
6. Select the region closest to your users.
7. Select "Create new project". Wait two to three minutes. Supabase prepares
   the database.
8. Open the "SQL Editor" in the left menu.
9. Select "New query".
10. Open the file `supabase/schema.sql` from this repository. Copy the full
    contents.
11. Paste the contents into the SQL editor. Select "Run".
12. Check the result. The "Table Editor" must show seven tables: `customers`,
    `conversations`, `messages`, `error_flags`, `feedback`, `escalations` and
    `reports`.
13. Open "Settings" in the left menu. Select "API".
14. Copy the "Project URL". This value goes to `SUPABASE_URL`.
15. Copy the `service_role` key under "Project API keys". This value goes to
    `SUPABASE_SERVICE_ROLE_KEY`.

The schema enables Row Level Security on all tables with no policies. The
public anon key cannot read or write data. Only the server with the service
role key has access.

## 8. Step-by-step: create the Clerk application

1. Open https://dashboard.clerk.com in your browser.
2. Create an account. You can sign in with GitHub.
3. Select "Create application".
4. Enter an application name, for example `chatbot-monitor`.
5. Select the sign-in options. Select "Email" and "Password" for staff login.
6. Select "Create application".
7. Open "API Keys" in the left menu.
8. Copy the "Publishable key". This value goes to
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
9. Copy the "Secret key" with the "Show" button. This value goes to
   `CLERK_SECRET_KEY`.
10. Stop public sign-ups. Open "Configure" and then "Restrictions". Set
    "Sign-up modes" to "Invitation only". This step keeps the staff area
    closed to the public.
11. Create staff users. Open "Users" and select "Create user". Enter an email
    address and a password for each administrator and support agent.
12. Set the administrator role for each administrator. Open the user, select
    "Metadata", and add this value to the "public" field:

    ```json
    { "role": "admin" }
    ```

13. Keep support agents without a role. The system reads a missing role as
    "agent".
14. Optional: Clerk automatically locks an account after too many failed
    password attempts. This behavior replaces the lockout rule in the design
    document. You can change the limit in "Configure", then "Attack
    protection".

## 9. Step-by-step: run the system on your computer

1. Install Node.js. Use version 20.9 or later. The file `package.json` uses
   npm.
2. Open a terminal in the project folder.
3. Copy the file `.env.example` to `.env.local`.
4. Fill the four required values in `.env.local`. Use the values from sections
   7 and 8. Add the OpenRouter values from section 6 if you want AI replies.
5. Run `npm install`. Wait for the download.
6. Run `npm run dev`.
7. Open http://localhost:3000 in your browser.
8. Select "Start chatting". Send a test message, for example "What are your
   opening hours?".
9. Rate the reply. Select "Helpful" or "Not helpful", or select a star.
10. Select "Talk to a human". Complete the form. The system shows a ticket
    number, for example `TKT-4RMX8P2K`.
11. Open `/status`. Enter the ticket number. The system shows the ticket
    status.
12. Sign in as staff on `/sign-in`. Use a staff user from section 8.
13. Open the dashboard. Check the cards, the charts and the recent activity.
14. Open "Flagged conversations". Send more test messages to create flags.
    An unknown question such as "Tell me a joke" causes a "Misinterpreted"
    flag. You can also send the same question again to test the re-ask rule.
15. Open "Complaints & escalations". Assign an agent and resolve the ticket.
16. Open "Reports". Generate a report. Export it as CSV or PDF.

## 10. Step-by-step: deploy to Vercel

1. Push this repository to GitHub. The remote is
   `https://github.com/Mwangi-lab-commits/Chatbots`.
2. Open https://vercel.com in your browser.
3. Create an account. Select "Continue with GitHub".
4. Select "Add New" and then "Project".
5. Select "Import" next to the Chatbots repository. Allow access when Vercel
   asks.
6. Keep the framework preset "Next.js". Vercel detects it automatically.
7. Open "Environment Variables". Add the four required variables from section
   6. Add the two OpenRouter variables if you use AI replies. Use the same
   names and values as `.env.local`.
8. Select "Deploy". Wait for the build.
9. Open the project address, for example `https://chatbots-xyz.vercel.app`.
10. Test the customer flow and the staff flow on the live address.
11. Optional for production: create a Clerk production instance with a custom
    domain. Open the Clerk dashboard, select "Production", and follow the
    domain steps. Replace the two Clerk keys in Vercel with the production
    keys.

## 11. YAGNI decisions

The system stays simple on purpose. The list below shows what was left out
and why the function is still complete.

| Decision | Reason |
|----------|--------|
| Clerk replaces the `users` table | Clerk stores staff accounts, password hashes and lockout rules. |
| Roles live in Clerk public metadata | No synchronization job and no webhook are necessary. |
| One star rating per reply | The feedback screen derives "helpful" (4 or 5 stars) and "not helpful" (1 or 2 stars) from the rating. |
| PDF export uses the browser print dialog | No heavy PDF library is necessary on the server. |
| The rule engine is the fallback | OpenRouter supplies real replies when `OPENROUTER_API_KEY` is set. The rule engine keeps the demo working without a key or when the API fails. |
| Charts aggregate in the server code | Simple queries with no extra database views or functions. |
| Lists limit to 200 rows | The screens stay fast. The CSV export contains the full data. |

## 12. Security notes

- All database access happens on the server. The browser never sees the
  Supabase keys.
- Row Level Security is on. There are no policies. This setting denies access
  to every anon key request.
- The customer flow stores no personal data. The system follows the Data
  Protection Act, 2019 (Kenya).
- Never commit `.env.local`. The file `.gitignore` excludes it.
- The OpenRouter key stays on the server. The browser never sees it. Set a
  credit limit and monitor usage. The public chat endpoint can be called
  without login.
- The ticket status lookup returns safe fields only: ticket number, reason,
  status, agent name and dates.

## 13. Test checklist

Use this checklist to show the system works. Each line maps to one screen
from the design document.

- [ ] Staff login accepts a valid account and rejects a wrong password.
- [ ] A customer sends a message and receives a reply.
- [ ] The customer rates a reply. The rating appears in the feedback screen.
- [ ] An unknown question produces a "Misinterpreted" flag.
- [ ] A repeated bot reply produces a "Repetitive" flag.
- [ ] A repeated customer question flags the previous bot reply.
- [ ] The customer creates an escalation and receives a ticket number.
- [ ] The ticket status page shows the current status.
- [ ] The dashboard shows correct totals and charts.
- [ ] The flagged list filters by date, error type and search text.
- [ ] The conversation review shows the full exchange with flags.
- [ ] Staff assign an agent and resolve a ticket. The status page shows
      "Resolved".
- [ ] The reports screen generates all four report types.
- [ ] The CSV export downloads a file with the full data.
- [ ] The print dialog saves a report as PDF.
