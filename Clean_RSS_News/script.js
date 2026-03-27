const WORKER_URL = "https://damp-cherry-8c0b.jamtests101.workers.dev/";

let allItems = [];
let currentIndex = 0;
const batchSize = 10;

document
  .getElementById("sourceSelect")
  .addEventListener("change", async function () {
    // console.log("Selected feed:", this.value);
    const feedUrl = this.value;
    if (!feedUrl) return;

    document.getElementById("feed").innerHTML = "";
    currentIndex = 0;

    const response = await fetch(
      `${WORKER_URL}?feed=${encodeURIComponent(feedUrl)}`
    );

    const xmlText = await response.text();
    allItems = parseRSS(xmlText);

    renderMore();
  });

document
  .getElementById("loadMore")
  .addEventListener("click", renderMore);

function renderMore() {

  const container = document.getElementById("feed");

  const nextItems = allItems.slice(
    currentIndex,
    currentIndex + batchSize
  );

  nextItems.forEach(item => {

    const div = document.createElement("div");
    div.className = "feed-item";

    const title = document.createElement("div");
    title.className = "feed-title";
    title.textContent = item.title;

    title.onclick = () => {
      window.open(item.link, "_blank");
    };

    const date = document.createElement("div");
    date.className = "feed-date";
    date.textContent = timeAgo(item.pubDate);

    div.appendChild(title);
    div.appendChild(date);
    container.appendChild(div);
  });

  currentIndex += batchSize;

  document.getElementById("loadMore").style.display =
    currentIndex < allItems.length ? "block" : "none";
}

function parseRSS(xmlText) {

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  return [...xmlDoc.querySelectorAll("item")].map(item => ({
    title: item.querySelector("title")?.textContent || "",
    link: item.querySelector("link")?.textContent || "",
    pubDate: item.querySelector("pubDate")?.textContent || ""
  }));
}

/* Human Friendly Time */

function timeAgo(dateString) {

  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return "Just now";
}
