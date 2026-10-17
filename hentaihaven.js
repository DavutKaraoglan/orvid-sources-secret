var SITE = "https://hentaihaven.xxx";
var API = "https://cms.hentaihaven.xxx/wp-json/wp/v2/wp-manga";
var PER_PAGE = 20;
var GZIP = { "Accept-Encoding": "gzip" };
var STREAM = /https:\/\/octopusmanifest\.org\/[0-9a-f-]+\/playlist\.m3u8/;

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var list = http.json(API + "?search=" + encodeURIComponent(query) + "&per_page=" + PER_PAGE + "&page=" + page
      + "&_fields=slug,title,date,meta", GZIP);
  var items = [];
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    if (!s.slug || !s.title) continue;
    var thumb = s.meta && s.meta.vraven_remote_thumbnail;
    items.push({
      url: SITE + "/watch/" + s.slug + "/",
      title: util.unescape(s.title.rendered),
      author: "",
      duration: -1,
      thumb: thumb ? "https://img.hentaihaven.xxx/" + thumb : null,
      date: s.date
    });
  }
  return { items: items, next: list.length >= PER_PAGE ? String(page + 1) : null };
}

function firstEpisode(url, html) {
  var slug = /\/watch\/([^\/]+)\//.exec(url)[1];
  var re = new RegExp('href="/watch/' + slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '/episode-(\\d+)/"', "g"), m, low = -1;
  while ((m = re.exec(html))) {
    var n = parseInt(m[1], 10);
    if (low < 0 || n < low) low = n;
  }
  return low < 0 ? null : SITE + "/watch/" + slug + "/episode-" + low + "/";
}

function resolve(url) {
  var html = http.get(url, GZIP);
  var stream = STREAM.exec(html);
  if (!stream && !/\/episode-\d+\/?$/.test(url)) {
    var episode = firstEpisode(url, html);
    if (!episode) throw new Error("no episode");
    html = http.get(episode, GZIP);
    stream = STREAM.exec(html);
  }
  if (!stream) throw new Error("no stream");
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html) || /<title>([^<]*)<\/title>/.exec(html);
  return {
    url: stream[0],
    hls: true,
    referer: SITE + "/",
    title: title ? util.unescape(title[1]).replace(/\s+[|–-]\s+Hentai Haven.*$/i, "") : ""
  };
}
