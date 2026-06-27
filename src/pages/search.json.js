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

  const articleItems = articles
    .filter((article) => article.data.status === "published")
    .map((article) => ({
      type: "Article",
      title: article.data.title,
      description: article.data.excerpt || article.data.description,
      url: `/articles/${article.id}/`,
      categories: article.data.categories || [],
      tags: article.data.tags || [],
      body: stripHtml(article.rendered?.html || ""),
    }));

  const resourceItems = resources
    .filter((resource) => resource.data.status === "published")
    .map((resource) => ({
      type: "Resource",
      title: `${resource.data.title} Resources`,
      description: resource.data.excerpt || resource.data.description,
      url: `/resources/${resource.id}/`,
      categories: resource.data.categories || [],
      tags: resource.data.tags || [],
      body: stripHtml(resource.rendered?.html || ""),
    }));

  return new Response(JSON.stringify([...articleItems, ...resourceItems]), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
