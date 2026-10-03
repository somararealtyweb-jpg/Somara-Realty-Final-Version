// Fetches the connected Instagram account's Reels via Instagram's own
// Graph API (the newer direct-to-Instagram login flow -- tokens that
// start with "IGAA") and returns them sorted best-performing first, so
// the homepage "Follow The Journey" section always leads with the reel
// getting the most engagement.
//
// Required environment variables (Netlify: Site configuration ->
// Environment variables):
//   INSTAGRAM_ACCESS_TOKEN   the long-lived token (starts "IGAA...").
//   INSTAGRAM_USER_ID        that account's numeric Instagram user ID
//                             (not the @username) -- from graph.instagram.com/me.
//
// NOTE: long-lived tokens expire roughly every 60 days and need to be
// refreshed/regenerated and re-saved here, or this will start failing
// (the frontend falls back to the placeholder images when that happens,
// so the section never breaks -- it just stops updating until the
// token is refreshed).

const GRAPH_HOST = "https://graph.instagram.com";
const GRAPH_VERSION = "v21.0";

exports.handler = async function () {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Instagram isn't connected yet." })
    };
  }

  const fields = [
    "id",
    "caption",
    "media_type",
    "media_product_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "like_count",
    "comments_count",
    "timestamp"
  ].join(",");

  const url =
    GRAPH_HOST + "/" + GRAPH_VERSION + "/" + userId + "/media" +
    "?fields=" + fields + "&limit=50&access_token=" + token;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("instagram-reels: Graph API error", data);
      return {
        statusCode: 502,
        body: JSON.stringify({ ok: false, error: (data && data.error && data.error.message) || "Instagram API error." })
      };
    }

    const items = (data.items || data.data || []);

    const reels = items.filter(function (item) {
      return item.media_product_type === "REELS" || item.media_type === "VIDEO";
    });

    reels.sort(function (a, b) {
      var scoreA = (a.like_count || 0) + (a.comments_count || 0);
      var scoreB = (b.like_count || 0) + (b.comments_count || 0);
      return scoreB - scoreA;
    });

    const top = reels.slice(0, 6).map(function (item) {
      return {
        id: item.id,
        caption: item.caption || "",
        permalink: item.permalink,
        thumbnail: item.thumbnail_url || item.media_url,
        likeCount: item.like_count || 0,
        commentCount: item.comments_count || 0
      };
    });

    return {
      statusCode: 200,
      headers: { "Cache-Control": "public, max-age=900" },
      body: JSON.stringify({ ok: true, reels: top })
    };
  } catch (err) {
    console.error("instagram-reels: request failed", err);
    return { statusCode: 502, body: JSON.stringify({ ok: false, error: "Could not reach Instagram." }) };
  }
};
