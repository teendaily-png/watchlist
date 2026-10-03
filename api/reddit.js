// Vercel serverless function: reads public r/television and r/movies data for the Discover tab.
// Reddit sometimes refuses requests from server IPs; when that happens the app shows a friendly note.
const UA = "web:watch-diary:1.0 (personal, non-commercial; reads public listings once a week)";

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error(r.status + " " + url);
  return r.json();
}
const slimPosts = d => ((d && d.data && d.data.children) || []).map(c => c.data)
  .filter(p => p && !p.stickied && !p.over_18)
  .map(p => ({ title: p.title, score: p.score, comments: p.num_comments }));

function flatten(children, depth, out) {
  for (const c of children || []) {
    if (c.kind !== "t1" || !c.data) continue;
    out.push({ body: String(c.data.body || "").slice(0, 2000), score: c.data.score || 0 });
    if (depth > 0 && c.data.replies && c.data.replies.data) flatten(c.data.replies.data.children, depth - 1, out);
  }
}

module.exports = async function handler(req, res) {
  const out = { tv: { posts: [] }, movies: { posts: [] }, thread: { title: "", comments: [] }, errors: [] };
  const jobs = [
    async () => { out.tv.posts = slimPosts(await getJson("https://www.reddit.com/r/television/top.json?t=week&limit=50&raw_json=1")); },
    async () => { out.movies.posts = slimPosts(await getJson("https://www.reddit.com/r/movies/top.json?t=week&limit=50&raw_json=1")); },
    async () => {
      const q = encodeURIComponent("What are you watching and what do you recommend");
      const found = await getJson("https://www.reddit.com/r/television/search.json?q=" + q + "&restrict_sr=1&sort=new&t=month&limit=5&raw_json=1");
      const post = ((found.data && found.data.children) || []).map(c => c.data).find(p => /what are you watching/i.test(p.title));
      if (!post) return;
      const thread = await getJson("https://www.reddit.com/r/television/comments/" + post.id + ".json?limit=400&depth=2&sort=top&raw_json=1");
      out.thread.title = post.title;
      flatten(thread[1] && thread[1].data && thread[1].data.children, 1, out.thread.comments);
    }
  ];
  const results = await Promise.allSettled(jobs.map(j => j()));
  results.forEach(r => { if (r.status === "rejected") out.errors.push(String(r.reason && r.reason.message || r.reason)); });
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  res.status(200).json(out);
};
