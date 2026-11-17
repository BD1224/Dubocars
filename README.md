# Dubocars

A simple website for a family or group to organize who is using which car, and when.
Each car is a column and the day runs top to bottom, like a calendar.

To sign in, just type your name. Tap an empty time slot to book a car. Everyone sees changes instantly.

## Use it for your own family

1. **Clone this repo**
   ```
   git clone <this-repo-url>
   cd Dubocars
   ```

2. **Create a Supabase project** (free) at [supabase.com](https://supabase.com).

3. **Set up the database.** In Supabase, open **SQL Editor**, paste the whole of
   `supabase/schema.sql`, and click **Run** (once).
   Before running it, edit the names, colors and cars near the middle of the file to match your family.
   You can also change them later in Supabase's **Table Editor**.

4. **Get your keys:**
   - **Project URL:** in Supabase, go to **Project Settings → Data API**. It looks like `https://abcdefgh.supabase.co`.
   - **Publishable key:** go to **Project Settings → API Keys**. It starts with `sb_publishable_`.

5. **Add them to the project.** Paste both values into `.env.example`, then rename that file to `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   You don't need the secret key. The app runs entirely in the browser, so it only uses the publishable key.

6. **Install and test locally:**
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000 and type one of the names from the database.

7. **Put it online with Vercel.** Import the repo at [vercel.com](https://vercel.com), add the same two
   variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) under
   **Environment Variables**, and deploy.

That's it. Share the link with your family.

> **Note:** signing in with just a name is not real security. Anyone who knows a name can sign in as that person.
> That's fine for a private family app, but don't put anything sensitive in it.

## Managing people and cars

Everything is managed in Supabase's **Table Editor**. No code changes are needed.
- **Add a person:** add a row to `users` with a name and a hex color.
- **Pause a person:** set `paused` to true. They can't sign in, but their past bookings stay visible.
- **Add or hide a car:** add a row to `cars`, or set `paused` to true to hide it.

## For developers
- `npm test` runs the unit tests.
- `npm run typecheck` checks the TypeScript.
- `npm run build` runs the production build.
- `INSTALL_AND_RUN.txt` has a full manual test checklist.
- `DESIGN.md` explains how the code is organized.
