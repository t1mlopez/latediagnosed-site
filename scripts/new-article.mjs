import fs from "fs";
import path from "path";
import prompts from "prompts";

const response = await prompts([
  {
    type: "text",
    name: "title",
    message: "Article title:",
  },
  {
    type: "text",
    name: "description",
    message: "Description:",
  },
  {
    type: "text",
    name: "category",
    message: "Primary category:",
  },
  {
    type: "text",
    name: "author",
    message: "Author:",
    initial: "late-diagnosed",
  },
]);

if (!response.title) {
  console.log("Cancelled.");
  process.exit(0);
}

const slug = response.title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const today = new Date().toISOString().split("T")[0];

const content = `---
title: "${response.title}"
description: "${response.description}"

categories:
  - "${response.category}"

tags:
  - "${response.category}"

author: "${response.author}"

publishDate: ${today}

status: draft

featured: false

excerpt: "${response.description}"

heroImage: /images/placeholder.jpg
---

## Key Takeaways

- 
- 
- 

## Overview

Start writing here.
`;

const filename = path.join("src/content/articles", `${slug}.mdx`);

if (fs.existsSync(filename)) {
  console.error(`File already exists: ${filename}`);
  process.exit(1);
}

fs.writeFileSync(filename, content);

console.log(`Created ${filename}`);
