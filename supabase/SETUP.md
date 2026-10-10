# Setting up the BTV database

The app talks to the Supabase project `uenshjtbgjztcgtgywlz`. These steps are done once, in the Supabase dashboard.

## 1. Create the tables

1. Open **SQL Editor** and click **New query**.
2. Paste all of [`schema.sql`](schema.sql) and click **Run**. It should say "Success. No rows returned".

The script is safe to run again: it only adds what is missing and never deletes tables or data. If it stops with "Type ... is missing ...", run [`fix-enum-labels.sql`](fix-enum-labels.sql) on its own in a new query, then run `schema.sql` again.

3. In a new query, paste all of [`storage.sql`](storage.sql) and click **Run**. It makes the `flyers` storage bucket for event flyer photos. It is also safe to run again.

Run both again whenever the app gets new database features. Rerunning keeps your events, and categories you removed in the app stay removed.

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

Supabase's built-in email sender only sends a few emails an hour and only to project team members. Add your own sender under **Authentication → Emails → SMTP Settings**. With Gmail: host `smtp.gmail.com`, port `587`, your full Gmail address as the username, and a Google app password (not your normal password) from myaccount.google.com/apppasswords.

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
