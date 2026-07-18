# Supabase setup guide

This project uses Supabase for authentication, the PostgreSQL database, and Row-Level Security (RLS). This guide lists the settings you need before running the app.

## 1. Create a project

1. Sign in to [supabase.com](https://supabase.com).
2. Click **New project**.
3. Pick an organization, name the project (e.g. `chatgpt-clone-dev`), and choose a region close to your users/server.
4. Choose the **Free tier** unless you need paid features.
5. Wait for the dashboard to finish provisioning (usually 1–2 minutes).

## 2. Get the connection credentials

Open **Project Settings → API**. Copy these two values:

| Setting                    | Where it is used             | Visibility        |
| -------------------------- | ---------------------------- | ----------------- |
| `SUPABASE_URL`             | Server and frontend          | Public (URL only) |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend build / browser env | Public            |
| `SUPABASE_SECRET_KEY`      | Server only                  | **Secret**        |

- The **publishable key** (`sb_publishable_...` or legacy `anon`) is safe to ship to the browser because every read/write goes through RLS policies.
- The **secret key** (`sb_secret_...` or legacy `service_role`) bypasses RLS and must live only in the server `.env` file. New projects should prefer the new `sb_*` formats.

## 3. Configure Google OAuth

### 3.1 Create OAuth 2.0 credentials in Google Cloud Console

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and sign in.
2. Select or create a project (e.g. `chatgpt-clone-dev`).
3. In the top-left hamburger menu, go to **APIs & Services → Credentials**.
4. Click **+ Create Credentials** and choose **OAuth client ID**.
5. If this is your first OAuth credential in the project, you may be asked to configure the **consent screen**:
   - Select **External** (or Internal if you are inside a Google Workspace).
   - Fill in the app name, user support email, and developer contact email.
   - Add the required scopes: at minimum `openid`, `email`, and `profile`.
   - Add test users if you chose External, otherwise only test users can sign in until the app is verified.
6. On the **Create OAuth client ID** page:
   - **Application type**: select **Web application**.
   - **Name**: enter something descriptive, e.g. `Supabase Auth`.
   - Under **Authorized redirect URIs**, click **+ Add URI** and enter: `https://<project-ref>.supabase.co/auth/v1/callback`
     - Replace `<project-ref>` with the reference ID shown in your Supabase project URL.
   - (Optional) For local testing you can also add `http://localhost:5173`, but Supabase redirects to the Supabase callback URI first, so the Supabase URI is the one that matters.
7. Click **Create**.
8. A popup shows your **Client ID** and **Client Secret**. Click **Download JSON** to save `client_secret_*.apps.googleusercontent.com.json`, then copy the values into Supabase.

### 3.2 Enable the Google Identity Toolkit / Sign-in API

The OAuth consent screen usually enables the necessary APIs automatically, but confirm:

1. In the Cloud Console, go to **APIs & Services → Enabled APIs & services**.
2. Search for **Google Identity Toolkit API** or **Google Sign-In**.
3. If not enabled, click **+ Enable APIs and Services** and enable it.

### 3.3 Paste the credentials into Supabase

1. Return to your Supabase project dashboard.
2. Go to **Authentication → Providers**.
3. Enable **Google**.
4. Paste the **Client ID** and **Client Secret** from the Google Cloud Console.
5. Save. Supabase Auth now supports Google sign-in.

### 3.4 Authorized redirect URI reminder

The only URI that must match exactly between Google Cloud Console and Supabase is:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

If you see a `redirect_uri_mismatch` error during sign-in, open the downloaded JSON or the Cloud Console credential and verify this URI is registered under **Authorized redirect URIs**.

For local development, the Supabase client uses the same callback URL, so no extra Google-side local URI is required.

## 4. Disable email confirmation (optional, for local learning)

If you want to test without clicking confirmation links, go to **Authentication → Settings → Email** and disable **Confirm email**. Only do this in a learning environment.

## 5. Apply the database schema

The project stores migrations under:

```
supabase/migrations/
```

Run the first migration from the dashboard:

1. Open the **SQL Editor**.
2. Copy the contents of `supabase/migrations/0001_initial_schema.sql`.
3. Click **Run**.

Alternatively, install the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) and run:

```sh
supabase link
supabase db push
```

## 6. Required environment variables

Add the values above to the correct `.env` files.

### Frontend `.env` (browser-safe)

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_...>
VITE_API_BASE_URL=http://localhost:3000
```

### Server `.env` (secret)

```
PORT=3000
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<sb_secret_...>
OPENAI_API_KEY=<your-openai-key>
LLM_PROVIDER=openai
CORS_ORIGIN=http://localhost:5173
```

## 7. Verify RLS is active

After running the first migration:

1. Open **Table Editor**.
2. Select `conversations` or `messages`.
3. Click **Authentication → Policies**.
4. Confirm policies are enabled and reference `auth.uid()`.

## 8. Next step

Once these values are in place, the server and frontend can start. The first slice only exercises the chat endpoint; actual database persistence is added in the auth + conversation ownership slice.
