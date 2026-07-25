import { getCollection } from "astro:content";

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  const articles = await getCollection("articles");
  const resources = await getCollection("resources");
  const pages = await getCollection("pages");

  function toSearchItem(entry, type, url) {
    return {
      type,
      title: entry.data.title,
      description: entry.data.excerpt || entry.data.description,
      url,
      categories: entry.data.categories || [],
      tags: entry.data.tags || [],
      keyTakeaways: entry.data.keyTakeaways || [],
      difficulty: entry.data.difficulty || "",
      audience: entry.data.audience || [],
      body: stripHtml(entry.rendered?.html || ""),
    };
  }

  const publishedItems = [
    ...articles
      .filter((entry) => entry.data.status === "published")
      .map((entry) =>
        toSearchItem(entry, "Article", `/articles/${entry.id}/`)
      ),
    ...resources
      .filter((entry) => entry.data.status === "published")
      .map((entry) =>
        toSearchItem(entry, "Resource", `/resources/${entry.id}/`)
      ),
    ...pages
      .filter((entry) => entry.data.status === "published")
      .map((entry) => toSearchItem(entry, "Page", `/pages/${entry.id}/`)),
  ];

  return new Response(JSON.stringify(publishedItems), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
