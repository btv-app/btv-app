# Setting up the BTV database

The app talks to the Supabase project `uenshjtbgjztcgtgywlz`. These steps are done once, in the Supabase dashboard.

## 1. Create the tables

1. Open **SQL Editor** and click **New query**.
2. Paste all of [`schema.sql`](schema.sql) and click **Run**. It should say "Success. No rows returned".

## 2. Turn on sign-in codes

The app signs people in with a 6-digit code sent by email, so nobody needs a password.

1. Open **Authentication → Emails** (called **Email Templates** in some dashboards) and pick **Magic Link**.
2. Replace the body with:

   ```html
   <h2>Your Between the Villes sign-in code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>If you didn't ask for it, you can ignore this email.</p>
   ```

3. Save. Do the same for the **Confirm signup** template, since a first-time sign-in uses that one.

Supabase's built-in email sender only sends a few emails an hour. Before launch, add your own sender under **Authentication → Emails → SMTP Settings** (for example Resend or Postmark).

## 3. Add the app key

In **Project Settings → API Keys**, copy the publishable key (`sb_publishable_...`) or, under **Legacy API keys**, the **anon public** key. Put it after `EXPO_PUBLIC_SUPABASE_ANON_KEY=` in the `.env` file at the root of the repo. Never use the `service_role` or secret key in the app.

## 4. Make yourself the owner

1. Open the app and sign in once with your email, so your account exists.
2. In the **SQL Editor**, run this with your email:

   ```sql
   update profiles set role = 'owner'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Sign out and back in. The **Review** tab appears, and events you add go live right away.
