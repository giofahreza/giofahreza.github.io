---
layout: post
title: "Routing AI Accounts Through IO Gateway"
date: 2026-07-29 08:10:00 +0700
tags:
  - io-gateway
  - ai
  - rust
  - infrastructure
excerpt: "Notes on why an AI account gateway needs stable client endpoints, quota-aware routing, and dashboard visibility."
cover_image: /assets/img/work/io-gateway-dashboard.png
nav_active: /blog/
body_class: site-body
stylesheets:
  - /assets/blog.css
---

AI tooling becomes hard to operate when every client speaks to a different provider, account, and quota surface. IO Gateway is my attempt to put one operational layer in front of that problem.

The useful pattern is not only proxying requests. The gateway has to understand accounts, quota pressure, routing preference, and fallback behavior before it forwards a prompt.

## Stable Client Surface

The client should not need to know which account will answer a request. Codex CLI, Claude Code, and OpenAI-compatible clients can point at one base URL while the gateway maps model names to provider targets.

That keeps local tooling boring. Client config changes less often, and provider changes move into the gateway where they can be inspected and adjusted.

## Account-Aware Routing

Routing AI traffic is different from simple round-robin load balancing. A useful router needs to avoid disabled accounts, respect quota state, watch recent failures, and spread active streams so one account does not take all concurrent work.

Priority routing also matters. Sometimes one account should be consumed first because it is cheaper, fresher, or dedicated to a specific workflow.

## Dashboard As Control Plane

When routing behavior is hidden, debugging becomes guesswork. The dashboard exists so account state, custom models, API keys, usage, quota windows, and latest errors are visible in one place.

The implementation detail that matters most is making operational state legible. If the gateway makes a routing decision, the dashboard should help explain why.

## Why This Belongs On A Personal Site

This portfolio is not just a gallery. It is also a place to document the engineering shape of projects while they are still active. IO Gateway is infrastructure work, so the note should explain the decisions, not just link to the repository.
