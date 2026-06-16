const WORKER_URL = "https://damp-cherry-8c0b.jamtests101.workers.dev/";

let allItems = [];
let currentIndex = 0;
const batchSize = 10;

const feedEl       = document.getElementById("feed");
const statusEl     = document.getElementById("status");
const loadMoreBtn  = document.getElementById("loadMore");
const settingsBtn  = document.getElementById("settingsToggle");
const settingsPane = document.getElementById("settingsPane");
const toggleImages = document.getElementById("toggleImages");
const toggleDesc   = document.getElementById("toggleDesc");

/* ─── Settings pane ─────────────────────────────── */

settingsBtn.addEventListener("click", () => {
  const isOpen = settingsPane.classList.toggle("open");
  settingsBtn.classList.toggle("active", isOpen);
  settingsPane.setAttribute("aria-hidden", String(!isOpen));
});

[toggleImages, toggleDesc].forEach(toggle => {
  toggle.addEventListener("change", () => {
    if (allItems.length === 0) return;
    feedEl.innerHTML = "";
    currentIndex = 0;
    renderMore();
  });
});

/* ─── Source select ─────────────────────────────── */

document.getElementById("sourceSelect")
  .addEventListener("change", async function () {
    const feedUrl = this.value;
    if (!feedUrl) return;

    feedEl.innerHTML = "";
    currentIndex = 0;
    allItems = [];
    loadMoreBtn.style.display = "none";
    setStatus("Fetching…");

    try {
      const response = await fetch(
        `${WORKER_URL}?feed=${encodeURIComponent(feedUrl)}`
      );
      const xmlText = await response.text();
      allItems = parseRSS(xmlText);

      if (allItems.length === 0) {
        setStatus("");
        feedEl.innerHTML = '<div class="empty-note">No items found.</div>';
        return;
      }

      setStatus(`${allItems.length} stories`);
      renderMore();
    } catch (err) {
      setStatus("Could not load feed.");
    }
  });

loadMoreBtn.addEventListener("click", renderMore);

/* ─── Render ─────────────────────────────────────── */

function renderMore() {
  const showImages = toggleImages.checked;
  const showDesc   = toggleDesc.checked;
  const nextItems  = allItems.slice(currentIndex, currentIndex + batchSize);

  nextItems.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "feed-item";
    div.style.animationDelay = `${i * 40}ms`;

    const title = document.createElement("div");
    title.className = "feed-title";
    title.textContent = item.title;
    title.setAttribute("role", "link");
    title.setAttribute("tabindex", "0");
    title.onclick = () => window.open(item.link, "_blank");
    title.onkeydown = (e) => { if (e.key === "Enter") window.open(item.link, "_blank"); };

    const date = document.createElement("div");
    date.className = "feed-date";
    date.textContent = timeAgo(item.pubDate);

    div.appendChild(title);

    if (showDesc && item.description) {
      const desc = document.createElement("div");
      desc.className = "feed-desc";
      desc.textContent = item.description;
      div.appendChild(desc);
    }

    div.appendChild(date);

    if (showImages && item.image) {
      const img = document.createElement("img");
      img.className = "feed-image";
      img.src = item.image;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => img.remove();
      div.appendChild(img);
    }

    feedEl.appendChild(div);
  });

  currentIndex += batchSize;
  loadMoreBtn.style.display = currentIndex < allItems.length ? "block" : "none";
}

/* ─── RSS parsing ────────────────────────────────── */

function parseRSS(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  return [...xmlDoc.querySelectorAll("item")].map(item => {
    const enclosure = item.querySelector("enclosure[type^='image']");
    const mediaThumbnail = item.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "thumbnail")[0];
    const mediaContent   = item.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "content")[0];

    const image =
      enclosure?.getAttribute("url") ||
      mediaThumbnail?.getAttribute("url") ||
      mediaContent?.getAttribute("url") ||
      extractImgFromHtml(item.querySelector("description")?.textContent) ||
      null;

    const rawDesc = item.querySelector("description")?.textContent || "";
    const description = stripHtml(rawDesc).trim().replace(/\s+/g, " ");

    return {
      title:       item.querySelector("title")?.textContent || "",
      link:        item.querySelector("link")?.textContent || "",
      pubDate:     item.querySelector("pubDate")?.textContent || "",
      description,
      image,
    };
  });
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function extractImgFromHtml(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/* ─── Utilities ──────────────────────────────────── */

function setStatus(text) {
  statusEl.textContent = text;
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return "";
  const seconds = Math.floor((Date.now() - date) / 1000);
  const intervals = [
    [31536000, "year"],
    [2592000,  "month"],
    [86400,    "day"],
    [3600,     "hour"],
    [60,       "minute"],
  ];
  for (const [secs, label] of intervals) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
