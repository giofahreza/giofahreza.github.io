---
layout: post
title: "GitVault And Local-First Security"
date: 2026-07-29 08:20:00 +0700
tags:
  - gitvault
  - security
  - mobile
  - local-first
excerpt: "Notes on building a vault where encrypted data can sync through GitHub without making GitHub the trust boundary."
cover_image: /assets/img/work/gitvault-passwords-list.png
nav_active: /blog/
body_class: site-body
stylesheets:
  - /assets/blog.css
---

GitVault is built around a simple constraint: the vault data should belong to the user, and sync should not turn the storage provider into the security boundary.

That pushes the design toward local-first encryption. The app can use GitHub as a durable sync target, but secrets need to be encrypted on device before they ever leave the app.

## Sync Is Storage, Not Trust

A private repository is useful for backup and history, but it should still be treated as remote storage. If encrypted blobs are the only data that leave the device, the sync layer can stay replaceable.

That separation makes the system easier to reason about:

1. The app owns encryption and unlock behavior.
2. The repository stores opaque encrypted state.
3. Device recovery and linking stay explicit workflows.

## Product Shape Matters

Security tools fail when the everyday workflow is too heavy. Passwords, notes, TOTP codes, SSH credentials, search, quick copy, and settings need to feel like one product instead of separate utilities.

That is why the interface work matters as much as the crypto boundary. If the vault is awkward, users route around it.

## What I Keep Watching

The important risks are around recovery, device linking, clipboard behavior, and making destructive actions clear. A secure app still needs humane defaults, because the weakest path is often operational rather than cryptographic.
