---
layout: post
title: "Building Browser-Only Developer Tools"
date: 2026-07-28 10:00:00 +0700
tags:
  - developer-tools
  - github-pages
  - frontend
excerpt: "How this site now ships useful developer tools and a blog without a backend."
nav_active: /blog/
body_class: site-body
stylesheets:
  - /assets/blog.css
---

GitHub Pages is enough for more than a portfolio. With careful browser APIs and static routing, a personal site can also host practical developer tools and a blog without adding a server.

This site now follows that model. The homepage stays as a personal hub, `/tools/` runs the developer toolbox in the browser, and `/blog/` provides a Jekyll-powered writing section.

## Why Browser-Only Tools Work

Most daily developer utilities do not need a backend. JSON formatting, Base64 conversion, URL encoding, hashing, QR generation, color conversion, regex testing, and timestamp conversion can all run locally in the browser.

That keeps the tools fast and private. Input stays on the user's device, deployment stays simple, and GitHub Pages can serve the whole experience as static files.

## Where Jekyll Helps

The tools page is still ordinary HTML and JavaScript, but Jekyll gives the site a cleaner structure:

```text
_posts/       Markdown articles
_layouts/     Shared page templates
_includes/    Reusable head, header, and footer
blog/         Blog index
tools/        Developer tools app
```

The important part is that Jekyll does not force every page to become a blog page. Static app pages can keep their own layout while posts get dates, permalinks, metadata, and a repeatable writing workflow.

## The Direction

The site now has three jobs:

1. The homepage introduces who I am and links to important places.
2. The tools page provides useful browser-only developer utilities.
3. The blog captures engineering notes and implementation decisions.

That split keeps each part focused while making the overall site easier to maintain.
