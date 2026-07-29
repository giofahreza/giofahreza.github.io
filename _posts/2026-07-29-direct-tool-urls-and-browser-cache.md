---
layout: post
title: "Direct Tool URLs And Browser Cache"
date: 2026-07-29 08:40:00 +0700
tags:
  - developer-tools
  - static-site
  - frontend
  - browser
excerpt: "Notes on giving each browser-only tool a shareable URL while keeping typed input cached locally."
nav_active: /blog/
body_class: site-body
stylesheets:
  - /assets/blog.css
---

Browser-only tools are more useful when every tool can be opened directly. `/json-formatter` and `/2fa` are better than one generic tools page that requires users to search every time.

The implementation can still stay static. Jekyll creates one endpoint per tool, and the JavaScript app reads the current path to select the matching utility.

## URLs Are Interface

Direct URLs make tools bookmarkable, searchable, and easier to share. They also make navigation feel more honest because the address bar reflects the current utility.

The sidebar can use real links while the app intercepts clicks for smooth in-page switching. Browser back and forward still work because tool changes update history state.

## Cache The Inputs, Not The Outputs

The site now saves editable fields per tool in `localStorage`. JSON Formatter input is separate from Base64 input, and TOTP settings are separate from both.

File inputs are intentionally skipped. Browsers do not allow restoring selected local files, and that restriction is the correct security behavior.

## Static Does Not Mean Disposable

A static tool can still feel persistent. If the browser can restore useful working state locally, the user gets continuity without adding a backend, accounts, or server-side storage.
