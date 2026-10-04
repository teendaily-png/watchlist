// Vercel serverless function for the Discover tab.
// Reads Reddit's public RSS feeds (meant for syndication) for r/television and r/movies, once a week.
// It identifies itself honestly and makes only a handful of requests. If Reddit refuses, it reports that and stops.
const UA = "web:watch-diary:1.1 (personal, non-commercial; reads public RSS feeds about once a week)";

async function getText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/atom+xml, application/rss+xml, text/xml;q=0.9, */*;q=0.5" } });
  if (!r.ok) throw new Error(r.status + " " + url);
  return r.text();
}
const dec = s => String(s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&");
function entries(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    out.push({
      title: dec((e.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]),
      html: dec((e.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1]),
      link: dec((e.match(/<link[^>]*href="([^"]+)"/) || [])[1])
    });
  }
  return out;
}
// turn a comment's HTML into text, keeping bold titles as **Title** the way the app expects
const toText = html => dec(String(html).replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**").replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const topPosts = xml => entries(xml).map((e, i) => ({ title: e.title, score: Math.max(20, (50 - i) * 20) }));

async function handler(req, res) {
  const out = { tv: { posts: [] }, movies: { posts: [] }, thread: { title: "", comments: [] }, errors: [] };
  const jobs = [
    async () => { out.tv.posts = topPosts(await getText("https://www.reddit.com/r/television/top/.rss?t=week&limit=50")); },
    async () => { out.movies.posts = topPosts(await getText("https://www.reddit.com/r/movies/top/.rss?t=week&limit=50")); },
    async () => {
      const q = encodeURIComponent("What are you watching and what do you recommend");
      const found = entries(await getText("https://www.reddit.com/r/television/search.rss?q=" + q + "&restrict_sr=1&sort=new&limit=5"));
      const post = found.find(e => /what are you watching/i.test(e.title));
      if (!post || !post.link) return;
      const base = post.link.replace(/\/?$/, "/");
      const list = entries(await getText(base + ".rss?limit=300&sort=top"));
      out.thread.title = post.title;
      out.thread.comments = list.slice(1).map(e => ({ body: toText(e.html).slice(0, 2000), score: 5 }));
    }
  ];
  const results = await Promise.allSettled(jobs.map(j => j()));
  results.forEach(r => { if (r.status === "rejected") out.errors.push(String(r.reason && r.reason.message || r.reason)); });
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  res.status(200).json(out);
}
module.exports = handler;
module.exports._parse = { entries, toText, topPosts };
