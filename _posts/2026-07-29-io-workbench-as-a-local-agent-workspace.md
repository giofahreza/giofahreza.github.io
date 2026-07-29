---
layout: post
title: "IO Workbench As A Local Agent Workspace"
date: 2026-07-29 08:30:00 +0700
tags:
  - io-workbench
  - rust
  - agents
  - developer-tools
excerpt: "Notes on shaping a local workspace server for files, sessions, shells, git, databases, and agent orchestration."
cover_image: /assets/img/work/io-workbench-icon.svg
nav_active: /blog/
body_class: site-body
stylesheets:
  - /assets/blog.css
---

IO Workbench is a local workspace server for the parts of development that usually scatter across terminals, editors, dashboards, and agent sessions.

The current direction is Rust-first: one server process, persisted local state, WebSocket updates, supervised commands, and a browser UI that can inspect and operate on a workspace.

## One Process, Many Workflows

A useful workbench needs to coordinate more than chat. Files, process output, PTY sessions, git state, database connections, settings, and agent runs all affect the same work.

Keeping those workflows behind one local API makes the UI simpler. It also gives agent orchestration a concrete operating surface instead of a pile of unrelated shell commands.

## Local State Is A Feature

The workbench keeps data close to the machine doing the work. That makes sense for indexed project roots, shell sessions, provider settings, database connections, and command history.

Local-first does not mean small. It means the default trust boundary is the developer's machine.

## The Hard Part

The hard part is not adding one more endpoint. It is keeping the model coherent as the surface grows. File APIs, process APIs, git APIs, and agent APIs need shared rules for workspace boundaries, cancellation, persistence, and replay.
