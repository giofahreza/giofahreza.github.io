#!/usr/bin/env python3
"""Local static server with GitHub Pages-style clean URL fallbacks."""

from __future__ import annotations

import argparse
import html
import http.server
import io
import os
import re
import socket
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse


DEFAULT_PORTS = (8100, 8101, 8102)
FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
POST_FILE_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})-(.+)\.md\Z")
POST_URL_RE = re.compile(r"\A/blog/(\d{4})/(\d{2})/(\d{2})/([^/]+)/?\Z")
INCLUDE_RE = re.compile(r"{%\s*include\s+([A-Za-z0-9._/-]+)\s*%}")


def first_available_port(ports: tuple[int, ...], host: str) -> int:
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
            except OSError:
                continue
            return port
    raise SystemExit(f"No available port found in: {', '.join(map(str, ports))}")


def parse_scalar(value: str) -> object:
    value = value.strip()
    if value == "":
        return ""
    if value in {"true", "True"}:
        return True
    if value in {"false", "False"}:
        return False
    if value in {"null", "Null", "~"}:
        return None
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [parse_scalar(part.strip()) for part in inner.split(",")]
    return value


def clean_yaml_lines(text: str) -> list[str]:
    return [
        line.rstrip()
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def line_indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def next_indent(lines: list[str], start: int) -> int | None:
    if start >= len(lines):
        return None
    return line_indent(lines[start])


def parse_yaml_dict(lines: list[str], index: int, indent: int) -> tuple[dict[str, object], int]:
    data: dict[str, object] = {}

    while index < len(lines):
        line = lines[index]
        current_indent = line_indent(line)
        if current_indent < indent:
            break
        if current_indent > indent:
            index += 1
            continue

        stripped = line.strip()
        if stripped.startswith("- "):
            break
        if ":" not in stripped:
            index += 1
            continue

        key, raw_value = stripped.split(":", 1)
        raw_value = raw_value.strip()
        index += 1

        if raw_value:
            data[key] = parse_scalar(raw_value)
            continue

        child_indent = next_indent(lines, index)
        if child_indent is None or child_indent <= current_indent:
            data[key] = None
            continue

        if lines[index].strip().startswith("- "):
            data[key], index = parse_yaml_list(lines, index, child_indent)
        else:
            data[key], index = parse_yaml_dict(lines, index, child_indent)

    return data, index


def parse_yaml_list(lines: list[str], index: int, indent: int) -> tuple[list[object], int]:
    items: list[object] = []

    while index < len(lines):
        line = lines[index]
        current_indent = line_indent(line)
        if current_indent < indent:
            break
        if current_indent > indent:
            index += 1
            continue

        stripped = line.strip()
        if not stripped.startswith("- "):
            break

        item_text = stripped[2:].strip()
        index += 1

        if not item_text:
            child_indent = next_indent(lines, index)
            if child_indent is None:
                items.append("")
            elif lines[index].strip().startswith("- "):
                item, index = parse_yaml_list(lines, index, child_indent)
                items.append(item)
            else:
                item, index = parse_yaml_dict(lines, index, child_indent)
                items.append(item)
            continue

        if ":" in item_text and not item_text.startswith(("http://", "https://")):
            key, raw_value = item_text.split(":", 1)
            item_dict: dict[str, object] = {}
            item_dict[key] = parse_scalar(raw_value.strip()) if raw_value.strip() else None

            child_indent = next_indent(lines, index)
            if child_indent is not None and child_indent > current_indent:
                child, index = parse_yaml_dict(lines, index, child_indent)
                item_dict.update(child)

            items.append(item_dict)
            continue

        items.append(parse_scalar(item_text))

    return items, index


def parse_simple_yaml(text: str) -> dict[str, object]:
    lines = clean_yaml_lines(text)
    data, _ = parse_yaml_dict(lines, 0, 0)
    return data


def split_front_matter(text: str) -> tuple[dict[str, object], str] | None:
    match = FRONT_MATTER_RE.match(text)
    if not match:
        return None

    metadata = parse_simple_yaml(match.group(1))
    body = text[match.end() :]
    return metadata, body


def escape_attr(value: object) -> str:
    return html.escape(str(value), quote=True)


def escape_text(value: object) -> str:
    return html.escape(str(value), quote=False)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_post_date(value: object, fallback_year: str, fallback_month: str, fallback_day: str) -> datetime:
    if isinstance(value, datetime):
        return value

    text = str(value or "").strip()
    for date_format in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, date_format)
        except ValueError:
            pass

    return datetime(int(fallback_year), int(fallback_month), int(fallback_day))


def format_date(value: datetime) -> str:
    return f"{value.strftime('%B')} {value.day}, {value.year}"


def inline_markdown(text: str) -> str:
    pieces: list[str] = []
    last = 0
    for match in re.finditer(r"`([^`]+)`", text):
        pieces.append(escape_text(text[last : match.start()]))
        pieces.append(f"<code>{escape_text(match.group(1))}</code>")
        last = match.end()
    pieces.append(escape_text(text[last:]))
    return "".join(pieces)


def markdown_to_html(markdown: str) -> str:
    lines = markdown.splitlines()
    blocks: list[str] = []
    paragraph: list[str] = []
    ordered_items: list[str] = []
    unordered_items: list[str] = []
    code_lines: list[str] = []
    code_language = ""
    in_code = False

    def flush_paragraph() -> None:
        if paragraph:
            blocks.append(f"<p>{inline_markdown(chr(10).join(paragraph))}</p>")
            paragraph.clear()

    def flush_ordered_list() -> None:
        if ordered_items:
            items = "".join(f"<li>{inline_markdown(item)}</li>" for item in ordered_items)
            blocks.append(f"<ol>{items}</ol>")
            ordered_items.clear()

    def flush_unordered_list() -> None:
        if unordered_items:
            items = "".join(f"<li>{inline_markdown(item)}</li>" for item in unordered_items)
            blocks.append(f"<ul>{items}</ul>")
            unordered_items.clear()

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_code:
                language_class = f' class="language-{escape_attr(code_language)}"' if code_language else ""
                blocks.append(f"<pre><code{language_class}>{escape_text(chr(10).join(code_lines))}</code></pre>")
                code_lines.clear()
                code_language = ""
                in_code = False
            else:
                flush_paragraph()
                flush_ordered_list()
                flush_unordered_list()
                code_language = stripped[3:].strip()
                in_code = True
            continue

        if in_code:
            code_lines.append(line)
            continue

        if not stripped:
            flush_paragraph()
            flush_ordered_list()
            flush_unordered_list()
            continue

        heading = re.match(r"^(#{1,4})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            flush_ordered_list()
            flush_unordered_list()
            level = len(heading.group(1))
            blocks.append(f"<h{level}>{inline_markdown(heading.group(2))}</h{level}>")
            continue

        ordered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if ordered:
            flush_paragraph()
            flush_unordered_list()
            ordered_items.append(ordered.group(1))
            continue

        unordered = re.match(r"^[-*]\s+(.+)$", stripped)
        if unordered:
            flush_paragraph()
            flush_ordered_list()
            unordered_items.append(unordered.group(1))
            continue

        flush_ordered_list()
        flush_unordered_list()
        paragraph.append(stripped)

    flush_paragraph()
    flush_ordered_list()
    flush_unordered_list()
    if in_code:
        language_class = f' class="language-{escape_attr(code_language)}"' if code_language else ""
        blocks.append(f"<pre><code{language_class}>{escape_text(chr(10).join(code_lines))}</code></pre>")

    return "\n".join(blocks)


class LocalJekyllRenderer:
    def __init__(self, root: Path) -> None:
        self.root = root

    @property
    def config(self) -> dict[str, object]:
        config_path = self.root / "_config.yml"
        if not config_path.exists():
            return {}
        return parse_simple_yaml(read_text(config_path))

    @property
    def navigation(self) -> list[dict[str, object]]:
        navigation_path = self.root / "_data" / "navigation.yml"
        if not navigation_path.exists():
            return []

        parsed = parse_simple_yaml(read_text(navigation_path))
        items = parsed.get("items", [])
        return [item for item in items if isinstance(item, dict)]

    def render_request(self, raw_path: str) -> str | None:
        parsed = urlparse(raw_path)
        request_path = unquote(parsed.path)
        post_match = POST_URL_RE.match(request_path)
        if post_match:
            return self.render_post_url(*post_match.groups())

        source_path = self.resolve_source_path(request_path)
        if not source_path or source_path.suffix not in {".html", ".md"}:
            return None

        split = split_front_matter(read_text(source_path))
        if not split:
            return None

        page, content = split
        page["url"] = self.page_url(source_path, request_path)
        return self.render_page(page, content)

    def resolve_source_path(self, request_path: str) -> Path | None:
        relative = request_path.lstrip("/")
        requested = (self.root / relative).resolve()

        try:
            requested.relative_to(self.root)
        except ValueError:
            return None

        candidates: list[Path]
        if requested.is_dir():
            candidates = [requested / "index.html"]
        else:
            clean_path = Path(str(requested).rstrip("/"))
            candidates = [
                clean_path,
                clean_path.with_suffix(".html"),
                clean_path / "index.html",
            ]

        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate

        normalized_request = "/" + request_path.strip("/") + "/"
        for candidate in self.root.glob("*.html"):
            split = split_front_matter(read_text(candidate))
            if not split:
                continue
            metadata, _ = split
            permalink = str(metadata.get("permalink", ""))
            if permalink and "/" + permalink.strip("/") + "/" == normalized_request:
                return candidate

        return None

    def page_url(self, source_path: Path, request_path: str) -> str:
        if request_path.endswith("/"):
            return request_path
        if source_path.name == "index.html":
            return f"/{source_path.parent.relative_to(self.root).as_posix().strip('/')}/"
        return request_path

    def render_page(self, page: dict[str, object], content: str) -> str:
        layout = str(page.get("layout", "")).strip()
        if layout == "tool":
            return self.document(
                page,
                self.render_includes(content),
                footer_scripts=self.script_tags(page.get("scripts", [])),
            )
        if layout == "blog":
            return self.document(page, self.blog_index(page), include_footer=True)
        if layout == "post":
            return self.document(page, self.post_article(page, content), include_footer=True)
        if layout == "page":
            return self.document(page, self.generic_page(page, content), include_footer=True)
        if layout == "resume":
            return self.document(
                page,
                self.resume_page(page),
                include_footer=True,
                footer_scripts='<script src="/assets/resume.js?v=20260830a" defer></script>',
            )
        return self.document(page, content, include_footer=True)

    def render_includes(self, content: str) -> str:
        include_root = (self.root / "_includes").resolve()

        def replace_include(match: re.Match[str]) -> str:
            include_path = (include_root / match.group(1)).resolve()
            try:
                include_path.relative_to(include_root)
            except ValueError:
                return ""
            if not include_path.exists() or not include_path.is_file():
                return ""
            return read_text(include_path)

        return INCLUDE_RE.sub(replace_include, content)

    def document(
        self,
        page: dict[str, object],
        content: str,
        *,
        include_footer: bool = False,
        footer_scripts: str = "",
    ) -> str:
        body_class = page.get("body_class") or "site-body"
        footer = self.site_footer() if include_footer else ""
        return (
            f"<!DOCTYPE html>\n"
            f'<html lang="{escape_attr(self.config.get("lang", "en-US"))}">\n'
            f"{self.head(page)}\n"
            f'<body class="{escape_attr(body_class)}">\n'
            f"{self.site_header(page)}\n"
            f"{content}\n"
            f"{footer}\n"
            f"{footer_scripts}\n"
            f"</body>\n"
            f"</html>\n"
        )

    def head(self, page: dict[str, object]) -> str:
        site_title = self.config.get("title", "Giofahreza Asady")
        title = f"{page.get('title')} - {site_title}" if page.get("title") else str(site_title)
        description = (
            page.get("description")
            or page.get("excerpt")
            or self.config.get("description")
            or ""
        )
        page_url = self.absolute_url(str(page.get("url", "/")))
        image_url = self.absolute_url(str(page.get("cover_image", "/assets/img/logo.png")))
        theme_color = page.get("theme_color") or "#111111"
        nav_version = self.config.get("nav_asset_version", "20260728c")
        stylesheets = self.stylesheet_tags(page.get("stylesheets", []))

        return f"""<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{escape_text(title)}</title>
  <meta name="description" content="{escape_attr(description)}">
  <meta name="author" content="{escape_attr(self.author_name())}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{escape_attr(page_url)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="{escape_attr(page.get('title') or site_title)}">
  <meta property="og:description" content="{escape_attr(description)}">
  <meta property="og:type" content="{escape_attr('article' if page.get('layout') == 'post' else 'website')}">
  <meta property="og:url" content="{escape_attr(page_url)}">
  <meta property="og:site_name" content="{escape_attr(site_title)}">
  <meta property="og:image" content="{escape_attr(image_url)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape_attr(page.get('title') or site_title)}">
  <meta name="twitter:description" content="{escape_attr(description)}">
  <meta name="twitter:image" content="{escape_attr(image_url)}">
  <meta name="theme-color" content="{escape_attr(theme_color)}">
  <link rel="icon" type="image/png" href="/assets/img/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Work+Sans:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/fa6-pro/css/all.css">
  <link rel="stylesheet" href="/assets/nav.css?v={escape_attr(nav_version)}">
  <script src="/assets/nav.js?v={escape_attr(nav_version)}" defer></script>
{stylesheets}
</head>"""

    def site_header(self, page: dict[str, object]) -> str:
        links = []
        page_url = str(page.get("url", ""))
        nav_active = str(page.get("nav_active", ""))
        site_title = str(self.config.get("title", "Giofahreza Asady"))
        brand_label = str(self.config.get("brand_label", "Software · AI · IT Systems"))

        for item in self.navigation:
            label = escape_text(item.get("label", ""))
            url = str(item.get("url", ""))
            if item.get("external"):
                links.append(
                    f'<a href="{escape_attr(url)}" target="_blank" rel="noopener noreferrer">{label}</a>'
                )
                continue

            is_active = nav_active == url or page_url == url or (
                url != "/" and page_url.startswith(url)
            )
            class_attr = ' class="is-active"' if is_active else ""
            links.append(f'<a{class_attr} href="{escape_attr(url)}">{label}</a>')

        return f"""<header class="global-header">
  <div class="global-header__inner">
    <a class="global-brand" href="/" aria-label="{escape_attr(site_title)} home">
      <img src="/assets/img/logo.png" alt="{escape_attr(site_title)}">
      <span>
        <strong>{escape_text(site_title)}</strong>
        <small>{escape_text(brand_label)}</small>
      </span>
    </a>
    <button class="global-menu-toggle" type="button" aria-label="Open navigation" aria-controls="globalNav" aria-expanded="false">
      <span class="global-menu-toggle__bar"></span>
      <span class="global-menu-toggle__bar"></span>
      <span class="global-menu-toggle__bar"></span>
    </button>
    <nav id="globalNav" class="global-nav" aria-label="Primary navigation">
      {' '.join(links)}
    </nav>
  </div>
</header>"""

    def site_footer(self) -> str:
        site_title = str(self.config.get("title", "Giofahreza Asady"))
        return f"""<footer class="site-footer">
  <div class="site-footer__inner">
    <p>&copy; {datetime.now().year} {escape_text(site_title)}. All rights reserved.</p>
    <div class="site-footer__links">
      <a href="https://github.com/giofahreza" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="https://linkedin.com/in/giofahreza" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="https://medium.com/@giofahreza" target="_blank" rel="noopener noreferrer">Medium</a>
      <a href="https://t.me/giofahreza" target="_blank" rel="noopener noreferrer">Contact</a>
    </div>
  </div>
</footer>"""

    def blog_index(self, page: dict[str, object]) -> str:
        cards = []
        for post in self.posts():
            tags = post.get("tags") or []
            tag_html = f"<span>{escape_text(', '.join(tags))}</span>" if tags else ""
            excerpt = post.get("excerpt") or ""
            cards.append(
                f"""<article class="post-card">
            <a class="post-card__title" href="{escape_attr(post['url'])}">{escape_text(post['title'])}</a>
            <p class="post-card__meta">
              <time datetime="{escape_attr(post['date'].isoformat())}">{escape_text(format_date(post['date']))}</time>
              {tag_html}
            </p>
            <p>{escape_text(excerpt)}</p>
          </article>"""
            )

        if cards:
            listing = f'<div class="post-grid">{"".join(cards)}</div>'
        else:
            listing = '<div class="empty-state"><h2>No posts yet</h2><p>New engineering notes will appear here.</p></div>'

        heading = page.get("heading") or page.get("title") or "Blog"
        description = page.get("description") or self.config.get("description") or ""
        return f"""<main class="site-main" aria-label="Content">
<section class="blog-hero">
  <div class="blog-wrapper">
    <p class="blog-kicker">Engineering Notes</p>
    <h1>{escape_text(heading)}</h1>
    <p>{escape_text(description)}</p>
  </div>
</section>

<section class="blog-list">
  <div class="blog-wrapper">
    {listing}
  </div>
</section>
</main>"""

    def post_article(self, page: dict[str, object], content: str) -> str:
        date = self.page_date(page)
        tags = page.get("tags") or []
        tag_html = f"<span>{escape_text(', '.join(tags))}</span>" if tags else ""
        cover = ""
        if page.get("cover_image"):
            cover = (
                f'<img class="blog-post__cover" src="{escape_attr(page["cover_image"])}" '
                f'alt="{escape_attr(page.get("title", ""))}">'
            )

        return f"""<main class="site-main" aria-label="Content">
<article class="blog-post">
  <div class="blog-wrapper blog-wrapper--narrow">
    <header class="blog-post__header">
      <p class="blog-kicker">Post</p>
      <h1>{escape_text(page.get("title", ""))}</h1>
      <p class="blog-post__meta">
        <time datetime="{escape_attr(date.isoformat())}">{escape_text(format_date(date))}</time>
        {tag_html}
      </p>
      {cover}
    </header>

    <div class="blog-prose">
      {markdown_to_html(content)}
    </div>
  </div>
</article>
</main>"""

    def generic_page(self, page: dict[str, object], content: str) -> str:
        description = f"<p>{escape_text(page['description'])}</p>" if page.get("description") else ""
        return f"""<main class="site-main" aria-label="Content">
<article class="blog-page">
  <div class="blog-wrapper">
    <header class="blog-page__header">
      <p class="blog-kicker">Page</p>
      <h1>{escape_text(page.get("title", ""))}</h1>
      {description}
    </header>
    <div class="blog-prose">
      {markdown_to_html(content)}
    </div>
  </div>
</article>
</main>"""

    def resume_page(self, page: dict[str, object]) -> str:
        resume_download = str(page.get("resume_download", "/assets/resume.md"))
        resume_source = (self.root / resume_download.lstrip("/")).resolve()

        try:
            resume_source.relative_to(self.root)
        except ValueError:
            resume_source = self.root / "assets" / "resume.md"

        if resume_source.exists() and resume_source.is_file():
            resume_html = markdown_to_html(read_text(resume_source))
        else:
            resume_html = "<p>Resume source is unavailable.</p>"

        active_variant = str(page.get("resume_variant", "career-profile"))

        def variant_link(variant: str, href: str, label: str) -> str:
            active = variant == active_variant
            class_name = "resume-variant-link is-active" if active else "resume-variant-link"
            current = ' aria-current="page"' if active else ""
            return (
                f'<a class="{class_name}" href="{escape_attr(href)}"{current}>'
                f"{escape_text(label)}</a>"
            )

        variants = "".join(
            (
                variant_link("career-profile", "/resume/", "Complete Profile"),
                variant_link("software-engineer", "/resume/software-engineer/", "Software Engineer"),
                variant_link("it-manager", "/resume/it-manager/", "IT Manager"),
            )
        )
        resume_aria = page.get("resume_aria") or page.get("title") or "Resume"

        return f"""<main class="site-main" aria-label="Content">
<div class="resume-shell">
  <nav class="resume-variants" aria-label="Career profile versions">
    <span class="resume-variants__label">Choose a version</span>
    {variants}
  </nav>
  <div class="resume-toolbar" aria-label="Resume actions">
    <a class="resume-action resume-action--secondary" href="{escape_attr(resume_download)}" download>Download Markdown</a>
    <button class="resume-action resume-action--primary" type="button" onclick="window.print()">Print / Save PDF</button>
  </div>
  <article class="resume-document" data-resume-content aria-label="{escape_attr(resume_aria)}">
    {resume_html}
  </article>
</div>
</main>"""

    def render_post_url(self, year: str, month: str, day: str, slug: str) -> str | None:
        for post in self.posts():
            if post["url"].strip("/") == f"blog/{year}/{month}/{day}/{slug}":
                return self.render_page(post["metadata"], post["content"])
        return None

    def posts(self) -> list[dict[str, object]]:
        post_dir = self.root / "_posts"
        posts: list[dict[str, object]] = []

        for path in sorted(post_dir.glob("*.md")):
            match = POST_FILE_RE.match(path.name)
            if not match:
                continue

            split = split_front_matter(read_text(path))
            if not split:
                continue

            metadata, content = split
            year, month, day, slug = match.groups()
            date = parse_post_date(metadata.get("date"), year, month, day)
            url = f"/blog/{year}/{month}/{day}/{slug}/"
            metadata.setdefault("layout", "post")
            metadata.setdefault("body_class", "site-body")
            metadata.setdefault("nav_active", "/blog/")
            metadata.setdefault("stylesheets", ["/assets/blog.css"])
            metadata["url"] = url
            posts.append(
                {
                    "title": metadata.get("title", slug.replace("-", " ").title()),
                    "date": date,
                    "url": url,
                    "tags": metadata.get("tags") or [],
                    "excerpt": metadata.get("excerpt") or "",
                    "metadata": metadata,
                    "content": content,
                }
            )

        return sorted(posts, key=lambda post: post["date"], reverse=True)

    def page_date(self, page: dict[str, object]) -> datetime:
        url_match = POST_URL_RE.match(str(page.get("url", "")))
        if url_match:
            year, month, day, _ = url_match.groups()
            return parse_post_date(page.get("date"), year, month, day)
        return datetime.now()

    def stylesheet_tags(self, stylesheets: object) -> str:
        if not isinstance(stylesheets, list):
            return ""
        return "\n".join(
            f'  <link rel="stylesheet" href="{escape_attr(str(stylesheet))}">'
            for stylesheet in stylesheets
        )

    def script_tags(self, scripts: object) -> str:
        if not isinstance(scripts, list):
            return ""
        return "\n".join(
            f'<script src="{escape_attr(str(script))}"></script>' for script in scripts
        )

    def absolute_url(self, path: str) -> str:
        if path.startswith(("http://", "https://")):
            return path

        site_url = str(self.config.get("url", "")).rstrip("/")
        normalized = "/" + path.lstrip("/")
        return f"{site_url}{normalized}" if site_url else normalized

    def author_name(self) -> str:
        author = self.config.get("author")
        if isinstance(author, dict):
            return str(author.get("name", self.config.get("title", "Giofahreza Asady")))
        return str(self.config.get("title", "Giofahreza Asady"))


class GitHubPagesHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".yml": "text/yaml",
        ".yaml": "text/yaml",
    }
    renderer: LocalJekyllRenderer | None = None

    def send_head(self):
        if self.command in {"GET", "HEAD"} and self.renderer:
            rendered = self.renderer.render_request(self.path)
            if rendered is not None:
                encoded = rendered.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                return io.BytesIO(encoded)

        return super().send_head()

    def translate_path(self, path: str) -> str:
        raw_path = super().translate_path(path)
        requested = Path(raw_path)

        if requested.exists():
            return str(requested)

        clean_path = Path(str(requested).rstrip("/"))

        candidates = (
            clean_path.with_suffix(".html"),
            clean_path / "index.html",
        )

        for candidate in candidates:
            if candidate.exists():
                return str(candidate)

        return str(requested)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve this site locally like GitHub Pages.")
    parser.add_argument(
        "--directory",
        "-d",
        default=os.getcwd(),
        help="Directory to serve. Defaults to the current working directory.",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind. Defaults to 127.0.0.1.",
    )
    parser.add_argument(
        "--port",
        type=int,
        help="Port to bind. Defaults to the first available of 8100, 8101, 8102.",
    )
    args = parser.parse_args()

    root = Path(args.directory).resolve()
    if not root.exists():
        raise SystemExit(f"Directory does not exist: {root}")

    os.chdir(root)
    port = args.port or first_available_port(DEFAULT_PORTS, args.host)
    GitHubPagesHandler.renderer = LocalJekyllRenderer(root)
    server = http.server.ThreadingHTTPServer((args.host, port), GitHubPagesHandler)

    print(f"Serving {root}")
    print(f"Local URL: http://{args.host}:{port}/")
    print("Clean URLs enabled: /resume/, /resume/software-engineer/, /resume/it-manager/, /tools/")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
