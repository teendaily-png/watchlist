# My watch diary: setup guide (about 20 minutes, one time)

You'll need three free accounts: TMDB (show data), Supabase (sync between devices), and Vercel (hosting).
Don't want sync? Skip step 2. Your list will then live in the browser you use.

## 1. Get a TMDB key
1. Create a free account at themoviedb.org.
2. Go to Settings, then API, and request a key (choose "personal / non-commercial" use).
3. Copy the **API Key** (a 32-character code).

## 2. Set up Supabase (sync)
1. Create a free project at supabase.com.
2. Open **SQL Editor**, click New query, paste everything from `supabase.sql`, and press **Run**.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon public** key.
   Never use the `service_role` key anywhere in this app.
4. Leave **Authentication > Providers > Email** switched on (it is by default). Sign-in uses an emailed magic link.

## 3. Fill in config.js
Open `config.js` in any text editor and paste in your TMDB key, Supabase URL and anon key. Save it.

## 4. Put it on Vercel
**Option A: GitHub (recommended)**
1. Create a new repository on github.com, click **Add file > Upload files**, and drag in `index.html`, `config.js`, `supabase.sql`, `SETUP.md` **and the `api` folder** (it holds `reddit.js`, which powers the Reddit buzz).
2. On vercel.com choose **Add New > Project**, import that repository, leave every setting as is, and press **Deploy**.

**Option B: command line**
In this folder run `npx vercel` and follow the prompts.

(Prefer something simpler? Netlify Drop at app.netlify.com/drop lets you drag the folder onto the page. Everything else in this guide is the same.)

## 5. Tell Supabase your site address
After Vercel gives you your address (like `https://my-watch-diary.vercel.app`):
1. In Supabase open **Authentication > URL Configuration**.
2. Set **Site URL** to that address and add it under **Redirect URLs**.

## 6. First run
1. Open your site, enter your email, and tap the link in the email on the same device.
2. Open **Settings > Import a backup** and choose the backup file exported from your old tracker.
   Shows are matched to TMDB by title. You'll get a note if any match looks wrong.
3. Open Settings to check your subscriptions (Netflix, Disney+, Crave and Prime Video are on by default).
4. Once you've signed in, go to Supabase **Authentication > Sign In / Providers** and turn off **Allow new users to sign up** so nobody else can create an account on your database.

## Reddit buzz (Discover tab)
- The first time you open the app each week, it reads the top posts of the week in r/television and r/movies, plus the weekly "what are you watching" thread, then matches the titles it finds against TMDB. Anything already on your list is hidden, and anything on your subscriptions is flagged.
- Reddit is the shaky part. It sometimes refuses requests that come from servers, and I couldn't test this against Reddit myself. If that happens you'll see a note in Discover and the app tries again next week. "Trending this week" (from TMDB) works either way.
- Title matching is automatic, so expect the odd miss. It only keeps titles that exactly match a popular show or movie.
- It reads public pages at low volume for personal use. Please don't turn it into something heavier.

## Upgrading from the first version
If you already ran the older `supabase.sql`, run the new one again. It adds movie support and keeps your shows.

## Good to know
- The TMDB key and the Supabase anon key are visible to anyone who views the page source. That's normal for this kind of app. Your data stays private because of the row-level security rules in `supabase.sql`.
- Streaming availability is for Canada (`REGION` in `config.js`) and comes from JustWatch through TMDB, so it can lag a little. HBO shows are on Crave only with the premium tier.
- Updating the app later: replace `index.html` in your repository and Vercel redeploys on its own. Your list is stored separately, so nothing is lost.
- Make a backup now and then from Settings > Export backup.

## If something's off
- **"Add your free TMDB key" banner:** `config.js` still has an empty key, or wasn't uploaded.
- **Search finds nothing:** check the TMDB key for typos.
- **Sign-in link opens a blank or wrong page:** the Site URL in step 5 doesn't match your address.
- **"Couldn't load your list":** the SQL in step 2 hasn't been run, or the URL/key is wrong.
