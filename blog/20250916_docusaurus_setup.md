---
slug: docusaurus-blog-setup
title: 'Setting Up My Blog with Docusaurus'
authors: [cielo]
date: 2025-09-16
tags: [tutorial, tools, docusaurus, blog]
---

I've been wanting a proper space to share my security writeups, conference notes, and random tech thoughts for a while now. After trying a few different platforms, I settled on **Docusaurus** and honestly, it's been perfect for what I need.

This post walks through how I got everything set up, plus some lessons learned along the way.

<!--truncate-->

## Why Docusaurus?

Before jumping into the setup, let me explain why I picked Docusaurus over other options:

- **Markdown-first**: I already write everything in Markdown anyway
- **Fast and clean**: React-based but optimized for static sites
- **Great for technical content**: Built-in syntax highlighting, code blocks, and admonitions
- **Flexible**: Can handle both blog posts and documentation
- **Free hosting**: Works perfectly with GitHub Pages

I looked at Ghost, Jekyll, and even considered just using Notion, but Docusaurus hit the sweet spot of simplicity and power.

## Prerequisites

You'll need:
- **Node.js** (v18 or higher) - I'm using v20
- A code editor (VS Code is my go-to)
- Basic command line knowledge
- A GitHub account (for hosting)

## Step 1: Create the Site

Docusaurus has a CLI tool that sets up everything for you:

```bash
npx create-docusaurus@latest my-blog classic
cd my-blog
```

The `classic` template gives you a blog, docs section, and a basic homepage. Perfect starting point.

## Step 2: Understanding the Structure

Here's what you get out of the box:

```
my-blog/
├── blog/              # Your blog posts live here
├── docs/              # Documentation (I use this for longer guides)
├── src/
│   ├── components/    # Custom React components
│   ├── css/          # Global styles
│   └── pages/        # Custom pages (About, etc.)
├── static/           # Images, PDFs, anything static
├── docusaurus.config.js # Main configuration
└── package.json
```

Most of my day-to-day work happens in the `blog/` folder, but I've also used `docs/` for some longer technical guides.

## Step 3: Writing Your First Post

Posts are just Markdown files in the `blog` directory. I name mine like `2025-09-16-post-title.md` to keep them organized chronologically.

Each post starts with frontmatter:

```markdown
---
slug: htb-sherlock-brutus
title: 'HTB Sherlock: Brutus'
authors: [cielo]
date: 2025-09-16
tags: [security, hack-the-box, tutorial, dfir]
---

Your content starts here...

<!--truncate-->

Everything after this comment appears only on the full post page.
```

The `<!--truncate-->` comment is handy - it controls what shows up on your blog homepage vs. the full post.

## Step 4: Customizing the Config

The `docusaurus.config.js` file controls everything. I mainly just updated the site title, URL, and navbar to match what I wanted. Most of the default settings worked fine for me.

## Step 5: Organizing Tags

For consistency, I created a `blog/tags.yml` file to define my tag structure:

```yaml
security:
  label: 'Security'
  permalink: '/security'
  description: 'Security-related posts and writeups'

hack-the-box:
  label: 'Hack The Box'
  permalink: '/htb'
  description: 'HTB writeups and challenges'

tutorial:
  label: 'Tutorial'
  permalink: '/tutorials'
  description: 'Step-by-step guides and how-tos'
```

This keeps my tagging consistent and creates nice landing pages for each tag.

## Step 6: Adding Some Style

I tweaked the CSS in `src/css/custom.css` to make things feel more "me":

```css
/* Dark theme tweaks */
[data-theme='dark'] {
  --ifm-background-color: #1a1a1a;
  --ifm-color-primary: #25c2a0;
}

/* Code block improvements */
.prism-code {
  font-size: 14px;
  line-height: 1.4;
}

/* Blog post spacing */
.markdown > h2 {
  margin-top: 2rem;
}
```

Nothing fancy, just making the reading experience a bit better.

## Step 7: Local Development

To see everything in action:

```bash
npm run start
```

This spins up a local dev server at `http://localhost:3000` with hot reloading. Any changes you make to posts or config get reflected immediately.

## Step 8: Deployment to GitHub Pages

Once I was happy with everything, deployment was surprisingly simple:

1. **Push to GitHub**: Create a repo and push your code
2. **Configure deployment**: Make sure your `docusaurus.config.js` has the right GitHub info
3. **Deploy**: Run `npm run deploy`

That's it! The command builds your site and pushes it to a `gh-pages` branch, which GitHub automatically serves.

For ongoing updates, I just run `npm run deploy` whenever I want to publish new posts.

## Bonus: Useful Plugins

I've added a few plugins that make life easier:

- **@docusaurus/plugin-google-analytics**: For tracking visitors
- **@docusaurus/plugin-sitemap**: SEO goodness
- **@docusaurus/plugin-pwa**: Makes the site work offline

## Tips and Gotchas

A few things I learned the hard way:

- **Image paths**: Put images in `static/img/` and reference them as `/img/filename.jpg`
- **Base URL**: If you're using GitHub Pages with a custom repo name, don't forget to set `baseUrl` correctly
- **Tags**: Keep them consistent from the start - refactoring tags later is annoying
- **Drafts**: Add `draft: true` to frontmatter for posts you're not ready to publish

## What's Next?

Now that the blog is running smoothly, I'm planning to add:
- A proper About page with my background
- Better syntax highlighting for security tools
- Maybe a newsletter signup
- Custom components for things like CTF writeup templates

## Reflections

Setting up Docusaurus this time around felt surprisingly familiar. I actually had a job a few years back where I was responsible for maintaining documentation using this exact tool. Back then, I knew absolutely nothing about React, static site generators, or even how to properly structure documentation. I spent countless hours reading docs, trial-and-error with configs, and slowly figuring out how everything worked together.

Now, being able to deploy my own blog with the same tool feels like such a full-circle moment. It's a good reminder that no learning experience is ever wasted - those late nights debugging deployment issues and trying to understand the build process ended up being exactly the foundation I needed for this project.

I'm grateful for my willingness to dive into unfamiliar territory back then. Every skill you pick up, even when it doesn't seem immediately relevant, tends to pay off in unexpected ways down the road.
