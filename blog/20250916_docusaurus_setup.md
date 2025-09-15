---
slug: docusaurus-blog-setup
title: 'Docusaurus Blog Setup'
authors: [cielo]
date: 2025-09-16
tags: [tutorial, tools, docusaurus]
---

I’ve always wanted a space to share my notes, writeups, and reflections, so I built this blog with **Docusaurus**.  

This post is a quick walkthrough of how I set it up.

<!--truncate-->

## Prerequisites

Before starting, make sure you have:
- **Node.js** (v18 or higher)  
- A code editor (e.g., **VS Code**)  
- Basic command line knowledge  

## Step 1: Create the Site

Docusaurus provides a handy CLI tool. Run:

```bash
npx create-docusaurus@latest my-blog classic
```

This generates a new project in my-blog with the classic template, which comes with a blog, docs, and other basics.

## Step 2: Know the Structure

The key directories are:

```
my-blog/
├── blog/              # Blog posts
├── docs/              # Documentation (optional)
├── src/pages/         # Custom React pages
├── static/            # Static assets (images, files)
└── docusaurus.config.js # Main config file
```

Most of my work happens inside the `blog/` folder.

## Step 3: Write a Post

A post is just a Markdown file in the `blog` directory, named like `YYYY-MM-DD-your-post-title.md`.

For example: `20250916_htb_sherlock_brutus.md`.

Each post starts with frontmatter metadata:

```markdown
---
slug: htb-sherlock-brutus
title: 'HTB Sherlock: Brutus'
authors: [cielo]
date: 2025-09-16
tags: [security, hack-the-box, tutorial, dfir]
---
```

## Step 4: Configure

Global settings live in `docusaurus.config.js`. Here I set the site title, tagline, URL, and customized the navbar and footer.

For consistent tags, I also added a `blog/tags.yml` file to define labels and permalinks.

## Step 5: Run & Deploy

To preview locally, I run:

```bash
npm run start
```

For deployment, I use GitHub Pages. After setting my repo info in `docusaurus.config.js`, deployment is as easy as:

```bash
npm run deploy
```

This builds the site and pushes it to the `gh-pages` branch.

## Conclusion

That’s it! Docusaurus makes it easy to launch a clean, fast, and maintainable blog with Markdown at its core.
