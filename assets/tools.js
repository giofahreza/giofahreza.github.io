(function () {
  "use strict";

  const tools = [
    { id: "json-format", title: "JSON Formatter", category: "Data", icon: "fa-code" },
    { id: "json-escape", title: "JSON Escape", category: "Data", icon: "fa-quote-right" },
    { id: "json-yaml", title: "JSON YAML Converter", category: "Data", icon: "fa-layer-group" },
    { id: "json-csv", title: "JSON CSV Converter", category: "Data", icon: "fa-table" },
    { id: "csv-clean", title: "CSV Formatter", category: "Data", icon: "fa-table-cells" },
    { id: "base64", title: "Base64 Encoder", category: "Encoding", icon: "fa-lock" },
    { id: "url-codec", title: "URL Encoder", category: "Encoding", icon: "fa-link" },
    { id: "query", title: "Query String Parser", category: "Encoding", icon: "fa-list" },
    { id: "html-entity", title: "HTML Entity Encoder", category: "Encoding", icon: "fa-code" },
    { id: "jwt", title: "JWT Decoder", category: "Security", icon: "fa-key" },
    { id: "totp", title: "2FA TOTP Generator", category: "Security", icon: "fa-shield-halved" },
    { id: "hash", title: "Hash Generator", category: "Security", icon: "fa-fingerprint" },
    { id: "md5", title: "MD5 Generator", category: "Security", icon: "fa-fingerprint" },
    { id: "hmac", title: "HMAC Generator", category: "Security", icon: "fa-signature" },
    { id: "password", title: "Password Generator", category: "Security", icon: "fa-dice" },
    { id: "timestamp", title: "Unix Timestamp Converter", category: "Date", icon: "fa-clock" },
    { id: "timezone", title: "Date Timezone Converter", category: "Date", icon: "fa-globe" },
    { id: "uuid", title: "UUID Generator", category: "Generators", icon: "fa-id-card" },
    { id: "ulid", title: "ULID Generator", category: "Generators", icon: "fa-barcode" },
    { id: "random-string", title: "Random String Generator", category: "Generators", icon: "fa-shuffle" },
    { id: "lorem", title: "Lorem Ipsum Generator", category: "Generators", icon: "fa-paragraph" },
    { id: "slug", title: "Slug Generator", category: "Generators", icon: "fa-link" },
    { id: "case", title: "Case Converter", category: "Generators", icon: "fa-font" },
    { id: "qr", title: "QR Code Generator", category: "Generators", icon: "fa-qrcode" },
    { id: "favicon", title: "Favicon Generator", category: "Generators", icon: "fa-star" },
    { id: "pwa", title: "PWA Manifest Generator", category: "Generators", icon: "fa-mobile-screen" },
    { id: "meta", title: "Meta Tag Generator", category: "Generators", icon: "fa-tags" },
    { id: "robots", title: "Robots.txt Generator", category: "Generators", icon: "fa-robot" },
    { id: "sitemap", title: "Sitemap.xml Generator", category: "Generators", icon: "fa-sitemap" },
    { id: "gitignore", title: "Gitignore Generator", category: "Generators", icon: "fa-code-branch" },
    { id: "regex", title: "Regex Tester", category: "Code", icon: "fa-asterisk" },
    { id: "diff", title: "Text Diff", category: "Code", icon: "fa-code-compare" },
    { id: "markdown", title: "Markdown Previewer", category: "Code", icon: "fa-file-lines" },
    { id: "html-format", title: "HTML Formatter", category: "Code", icon: "fa-code" },
    { id: "css-format", title: "CSS Formatter", category: "Code", icon: "fa-palette" },
    { id: "js-format", title: "JavaScript Formatter", category: "Code", icon: "fa-js" },
    { id: "sql-format", title: "SQL Formatter", category: "Code", icon: "fa-database" },
    { id: "cron", title: "Cron Explainer", category: "Code", icon: "fa-calendar-days" },
    { id: "docker-compose", title: "Docker Compose YAML Validator", category: "Code", icon: "fa-box" },
    { id: "color", title: "Color Converter", category: "Frontend", icon: "fa-eye-dropper" },
    { id: "contrast", title: "Contrast Checker", category: "Frontend", icon: "fa-circle-half-stroke" },
    { id: "css-unit", title: "CSS Unit Converter", category: "Frontend", icon: "fa-ruler" },
    { id: "css-clamp", title: "CSS Clamp Generator", category: "Frontend", icon: "fa-up-right-and-down-left-from-center" },
    { id: "box-shadow", title: "Box Shadow Generator", category: "Frontend", icon: "fa-square" },
    { id: "radius", title: "Border Radius Generator", category: "Frontend", icon: "fa-vector-square" },
    { id: "gradient", title: "Gradient Generator", category: "Frontend", icon: "fa-fill-drip" },
    { id: "svg-optimizer", title: "SVG Optimizer", category: "Frontend", icon: "fa-bezier-curve" },
    { id: "image-converter", title: "Image Converter", category: "Frontend", icon: "fa-image" },
    { id: "http-status", title: "HTTP Status Reference", category: "Reference", icon: "fa-server" },
    { id: "mime", title: "MIME Type Lookup", category: "Reference", icon: "fa-file" },
    { id: "user-agent", title: "User Agent Parser", category: "Reference", icon: "fa-desktop" }
  ];

  const categories = ["Data", "Encoding", "Security", "Date", "Generators", "Code", "Frontend", "Reference"];
  const state = { activeId: tools[0].id, timers: [] };
  const $ = (selector) => document.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setOutput(value, selector = "#output") {
    const target = $(selector);
    if (!target) return;
    if ("value" in target) target.value = value;
    else target.innerHTML = value;
  }

  function getOutput() {
    const target = $("#output");
    if (!target) return "";
    return "value" in target ? target.value : target.textContent;
  }

  function clearTimers() {
    state.timers.forEach((timer) => clearInterval(timer));
    state.timers = [];
  }

  function field(label, id, value = "", type = "text") {
    return `<div class="inline-field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}"></div>`;
  }

  function selectField(label, id, options) {
    return `<div class="inline-field"><label for="${id}">${label}</label><select id="${id}">${options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}</select></div>`;
  }

  function textTool(inputLabel = "Input", outputLabel = "Output", sample = "") {
    return `
      <div class="tool-grid">
        <div class="field"><label for="input">${inputLabel}</label><textarea id="input">${escapeHtml(sample)}</textarea></div>
        <div class="field"><label for="output">${outputLabel}</label><textarea id="output" readonly></textarea></div>
      </div>`;
  }

  function outputArea(label = "Output") {
    return `<div class="field"><label for="output">${label}</label><textarea id="output" readonly></textarea></div>`;
  }

  function action(label, id, primary = false, icon = "fa-play") {
    return `<button id="${id}" class="tool-action${primary ? " primary" : ""}" type="button"><i class="fa ${icon}"></i>${label}</button>`;
  }

  function bind(id, event, handler) {
    const node = $("#" + id);
    if (node) {
      node.addEventListener(event, (domEvent) => {
        try {
          const result = handler(domEvent);
          if (result && typeof result.catch === "function") {
            result.catch((error) => setOutput(error.message));
          }
        } catch (error) {
          setOutput(error.message);
        }
      });
    }
  }

  function renderNav(filter = "") {
    const term = filter.trim().toLowerCase();
    const nav = $("#toolNav");
    nav.innerHTML = categories.map((category) => {
      const items = tools.filter((tool) => tool.category === category && (!term || `${tool.title} ${tool.category}`.toLowerCase().includes(term)));
      if (!items.length) return "";
      return `
        <div class="nav-group">
          <p class="nav-group-title">${category}</p>
          ${items.map((tool) => `
            <button class="tool-nav-button${tool.id === state.activeId ? " is-active" : ""}" type="button" data-tool="${tool.id}">
              <i class="fa ${tool.icon}"></i><span>${tool.title}</span>
            </button>
          `).join("")}
        </div>`;
    }).join("");
    nav.querySelectorAll("[data-tool]").forEach((button) => {
      button.addEventListener("click", () => selectTool(button.dataset.tool));
    });
  }

  function renderToolSelect(filter = "") {
    const select = $("#toolSelect");
    if (!select) return;
    const term = filter.trim().toLowerCase();
    const matched = tools.filter((tool) => !term || `${tool.title} ${tool.category}`.toLowerCase().includes(term));
    if (!matched.length) {
      select.innerHTML = `<option value="">No tools found</option>`;
      select.value = "";
      return;
    }
    select.innerHTML = categories.map((category) => {
      const items = matched.filter((tool) => tool.category === category);
      if (!items.length) return "";
      return `<optgroup label="${category}">${items.map((tool) => `<option value="${tool.id}">${escapeHtml(tool.title)}</option>`).join("")}</optgroup>`;
    }).join("");
    select.value = matched.some((tool) => tool.id === state.activeId) ? state.activeId : matched[0].id;
  }

  function selectTool(id) {
    clearTimers();
    state.activeId = id;
    const tool = tools.find((item) => item.id === id) || tools[0];
    $("#toolTitle").textContent = tool.title;
    $("#toolCategory").textContent = tool.category;
    $("#toolPanel").innerHTML = templateFor(id);
    renderNav($("#toolSearch").value);
    renderToolSelect($("#toolSearch").value);
    const select = $("#toolSelect");
    if (select && Array.from(select.options).some((option) => option.value === tool.id)) select.value = tool.id;
    setupFor(id);
  }

  function templateFor(id) {
    switch (id) {
      case "json-format":
        return textTool("JSON", "Result", '{"name":"gio","skills":["go","node","php"],"active":true}') + `<div class="tool-actions">${action("Format", "format", true)}${action("Minify", "minify")}${action("Sort Keys", "sortKeys")}</div>`;
      case "json-escape":
        return textTool("Text", "JSON String", 'Line 1\n"quoted" value') + `<div class="tool-actions">${action("Escape", "escape", true)}${action("Unescape", "unescape")}</div>`;
      case "json-yaml":
        return textTool("JSON or YAML", "Result", '{"service":"api","replicas":2,"ports":[8080,8443]}') + `<div class="tool-actions">${action("JSON to YAML", "jsonToYaml", true)}${action("YAML to JSON", "yamlToJson")}</div>`;
      case "json-csv":
        return textTool("JSON or CSV", "Result", '[{"name":"Gio","role":"Engineer"},{"name":"Ada","role":"Researcher"}]') + `<div class="tool-actions">${action("JSON to CSV", "jsonToCsv", true)}${action("CSV to JSON", "csvToJson")}</div>`;
      case "csv-clean":
        return textTool("CSV", "Formatted CSV", 'name, role\n"Gio" , "Engineer"\nAda,Researcher') + `<div class="tool-actions">${action("Format", "format", true)}</div>`;
      case "base64":
        return textTool("Text", "Base64", "Hello developer") + `<div class="tool-actions">${action("Encode", "encode", true)}${action("Decode", "decode")}</div>`;
      case "url-codec":
        return textTool("Text", "Result", "https://giofahreza.com/tools?search=json tools") + `<div class="tool-actions">${action("Encode", "encode", true)}${action("Decode", "decode")}</div>`;
      case "query":
        return textTool("URL or Query", "Result", "https://example.com/callback?code=abc&scope=openid%20email") + `<div class="tool-actions">${action("Parse", "parse", true)}${action("Build", "build")}</div>`;
      case "html-entity":
        return textTool("HTML", "Result", '<button class="btn">Save & Close</button>') + `<div class="tool-actions">${action("Encode", "encode", true)}${action("Decode", "decode")}</div>`;
      case "jwt":
        return textTool("JWT", "Decoded", "") + `<div class="tool-actions">${action("Decode", "decode", true)}</div>`;
      case "totp":
        return `
          <div class="tool-grid">
            <div>
              <div class="inline-grid two">
                ${field("Secret Base32", "secret", "JBSWY3DPEHPK3PXP")}
                ${field("Account", "account", "gio@example.com")}
                ${field("Issuer", "issuer", "Giofahreza")}
                ${selectField("Digits", "digits", [{ value: "6", label: "6" }, { value: "8", label: "8" }])}
              </div>
              <div class="tool-actions">${action("Generate Secret", "newSecret", true, "fa-shuffle")}${action("Refresh", "refresh")}</div>
              <div id="output" class="output-box"></div>
            </div>
            <div>
              <div id="totpCode" class="totp-code">------</div>
              <p id="totpTimer" class="muted"></p>
              <div id="qrTarget" class="qr-target"></div>
            </div>
          </div>`;
      case "hash":
        return textTool("Text", "Hashes", "Hello developer") + `<div class="tool-actions">${action("Generate", "generate", true)}</div>`;
      case "md5":
        return textTool("Text", "MD5", "Hello developer") + `<div class="tool-actions">${action("Generate", "generate", true)}</div>`;
      case "hmac":
        return textTool("Message", "HMAC", "Hello developer") + `<div class="inline-grid two">${field("Secret", "secret", "secret")}${selectField("Algorithm", "algorithm", [{ value: "SHA-256", label: "SHA-256" }, { value: "SHA-384", label: "SHA-384" }, { value: "SHA-512", label: "SHA-512" }])}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>`;
      case "password":
        return `<div class="inline-grid">${field("Length", "length", "24", "number")}${field("Count", "count", "6", "number")}${selectField("Mode", "mode", [{ value: "password", label: "Password" }, { value: "passphrase", label: "Passphrase" }])}${field("Separator", "separator", "-")}</div><div class="tool-actions">${action("Generate", "generate", true, "fa-dice")}</div>${outputArea("Generated values")}`;
      case "timestamp":
        return `<div class="inline-grid three">${field("Unix Timestamp", "unix", String(Math.floor(Date.now() / 1000)))}${field("Date Time", "datetime", new Date().toISOString().slice(0, 19), "datetime-local")}${selectField("Unit", "unit", [{ value: "seconds", label: "Seconds" }, { value: "milliseconds", label: "Milliseconds" }])}</div><div class="tool-actions">${action("Unix to Date", "toDate", true)}${action("Date to Unix", "toUnix")}${action("Now", "now")}</div>${outputArea("Converted time")}`;
      case "timezone":
        return `<div class="inline-grid three">${field("Date Time", "datetime", new Date().toISOString().slice(0, 19), "datetime-local")}${field("From Timezone", "fromTz", Intl.DateTimeFormat().resolvedOptions().timeZone)}${field("To Timezone", "toTz", "UTC")}</div><div class="tool-actions">${action("Convert", "convert", true)}</div>${outputArea("Converted zones")}`;
      case "uuid":
        return `<div class="inline-grid two">${field("Count", "count", "10", "number")}${selectField("Version", "version", [{ value: "v4", label: "UUID v4" }])}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Generated UUIDs")}`;
      case "ulid":
        return `<div class="inline-grid two">${field("Count", "count", "10", "number")}${field("Prefix", "prefix", "")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Generated ULIDs")}`;
      case "random-string":
        return `<div class="inline-grid">${field("Length", "length", "32", "number")}${field("Count", "count", "5", "number")}${field("Characters", "chars", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")}${field("Prefix", "prefix", "")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Generated strings")}`;
      case "lorem":
        return `<div class="inline-grid three">${field("Paragraphs", "paragraphs", "3", "number")}${field("Sentences", "sentences", "4", "number")}${selectField("Format", "format", [{ value: "plain", label: "Plain" }, { value: "html", label: "HTML" }])}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Generated text")}`;
      case "slug":
        return textTool("Text", "Slug", "Build Useful Developer Tools") + `<div class="tool-actions">${action("Generate", "generate", true)}</div>`;
      case "case":
        return textTool("Text", "Cases", "Build useful developer tools") + `<div class="tool-actions">${action("Convert", "convert", true)}</div>`;
      case "qr":
        return `<div class="tool-grid"><div class="field"><label for="input">Text</label><textarea id="input">https://giofahreza.com/tools</textarea><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("QR content")}</div><div id="qrTarget" class="qr-target"></div></div>`;
      case "favicon":
        return `<div class="inline-grid three">${field("Text", "text", "G")}${field("Background", "bg", "#111318", "color")}${field("Foreground", "fg", "#ffffff", "color")}</div><div class="tool-actions">${action("Generate", "generate", true)}<a id="downloadIcon" class="tool-action hidden" download="favicon.png"><i class="fa fa-download"></i>Download</a></div><canvas id="iconCanvas" width="256" height="256" class="swatch"></canvas>${outputArea("HTML snippet")}`;
      case "pwa":
        return `<div class="inline-grid two">${field("Name", "name", "Giofahreza Tools")}${field("Short Name", "shortName", "Tools")}${field("Start URL", "startUrl", "/tools")}${field("Theme Color", "theme", "#111318", "color")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Manifest JSON")}`;
      case "meta":
        return `<div class="inline-grid two">${field("Title", "title", "Giofahreza Developer Tools")}${field("Description", "description", "Free browser-based developer tools.")}${field("URL", "url", "https://giofahreza.com/tools")}${field("Image URL", "image", "https://giofahreza.com/assets/img/logo.png")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Meta tags")}`;
      case "robots":
        return `<div class="inline-grid three">${selectField("Robots", "robotsMode", [{ value: "allow", label: "Allow All" }, { value: "block", label: "Block All" }])}${field("Sitemap URL", "sitemap", "https://giofahreza.com/sitemap.xml")}${field("Crawl Delay", "delay", "")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Robots.txt")}`;
      case "sitemap":
        return textTool("URLs", "Sitemap XML", "https://giofahreza.com/\nhttps://giofahreza.com/tools") + `<div class="tool-actions">${action("Generate", "generate", true)}</div>`;
      case "gitignore":
        return `<div class="inline-grid two"><div class="inline-field"><label for="template">Template</label><select id="template">${gitignoreOptions()}</select></div>${field("Extra Patterns", "extra", ".env.local\n.DS_Store")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea(".gitignore")}`;
      case "regex":
        return `<div class="inline-grid two">${field("Pattern", "pattern", "\\b\\w+@\\w+\\.\\w+\\b")}${field("Flags", "flags", "gi")}</div><div class="field"><label for="input">Text</label><textarea id="input">hello@giofahreza.com and invalid-email</textarea></div><div class="tool-actions">${action("Test", "test", true)}</div><div id="output" class="output-box"></div>`;
      case "diff":
        return `<div class="tool-grid"><div class="field"><label for="left">Left</label><textarea id="left">one\ntwo\nthree</textarea></div><div class="field"><label for="right">Right</label><textarea id="right">one\n2\nthree\nfour</textarea></div></div><div class="tool-actions">${action("Compare", "compare", true)}</div>${outputArea("Diff result")}`;
      case "markdown":
        return `<div class="tool-grid"><div class="field"><label for="input">Markdown</label><textarea id="input"># Hello\n\n- JSON\n- JWT\n- 2FA</textarea></div><div class="field"><label>Preview</label><div id="output" class="preview-box"></div></div></div><div class="tool-actions">${action("Preview", "preview", true)}</div>`;
      case "html-format":
        return textTool("HTML", "Result", "<main><h1>Hello</h1><p>Developer tools</p></main>") + `<div class="tool-actions">${action("Beautify", "beautify", true)}${action("Minify", "minify")}</div>`;
      case "css-format":
        return textTool("CSS", "Result", ".button{color:white;background:#111}.button:hover{background:#333}") + `<div class="tool-actions">${action("Beautify", "beautify", true)}${action("Minify", "minify")}</div>`;
      case "js-format":
        return textTool("JavaScript", "Result", "function hello(name){return `Hello ${name}`;}") + `<div class="tool-actions">${action("Beautify", "beautify", true)}${action("Minify", "minify")}</div>`;
      case "sql-format":
        return textTool("SQL", "Result", "select id,name from users where active=1 order by created_at desc") + `<div class="tool-actions">${action("Format", "format", true)}</div>`;
      case "cron":
        return `<div class="inline-grid two">${field("Cron", "cron", "*/15 9-17 * * 1-5")}${selectField("Dialect", "dialect", [{ value: "standard", label: "5 fields" }])}</div><div class="tool-actions">${action("Explain", "explain", true)}</div>${outputArea("Explanation")}`;
      case "docker-compose":
        return textTool("docker-compose.yml", "Result", "services:\n  app:\n    image: nginx\n    ports:\n      - \"8080:80\"") + `<div class="tool-actions">${action("Validate", "validate", true)}</div>`;
      case "color":
        return `<div class="inline-grid three">${field("Color", "colorInput", "#1f6feb", "color")}${field("HEX", "hex", "#1f6feb")}${field("Alpha", "alpha", "1", "number")}</div><div class="tool-actions">${action("Convert", "convert", true)}</div><div id="swatch" class="swatch"></div>${outputArea("Color values")}`;
      case "contrast":
        return `<div class="inline-grid two">${field("Foreground", "fg", "#ffffff", "color")}${field("Background", "bg", "#111318", "color")}</div><div class="tool-actions">${action("Check", "check", true)}</div><div id="swatch" class="swatch"></div>${outputArea("Contrast result")}`;
      case "css-unit":
        return `<div class="inline-grid">${field("Pixels", "px", "16", "number")}${field("Root Size", "root", "16", "number")}${field("Parent Size", "parent", "16", "number")}${field("Viewport Width", "viewport", "1440", "number")}</div><div class="tool-actions">${action("Convert", "convert", true)}</div>${outputArea("Converted units")}`;
      case "css-clamp":
        return `<div class="inline-grid">${field("Min Size px", "minSize", "16", "number")}${field("Max Size px", "maxSize", "28", "number")}${field("Min Width px", "minWidth", "360", "number")}${field("Max Width px", "maxWidth", "1200", "number")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div>${outputArea("Clamp CSS")}`;
      case "box-shadow":
        return `<div class="inline-grid">${field("X", "x", "0", "number")}${field("Y", "y", "12", "number")}${field("Blur", "blur", "30", "number")}${field("Spread", "spread", "0", "number")}${field("Color", "color", "#000000", "color")}${field("Alpha", "alpha", "0.25", "number")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div><div id="swatch" class="swatch"></div>${outputArea("Box shadow CSS")}`;
      case "radius":
        return `<div class="inline-grid">${field("Top Left", "tl", "8", "number")}${field("Top Right", "tr", "8", "number")}${field("Bottom Right", "br", "8", "number")}${field("Bottom Left", "bl", "8", "number")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div><div id="swatch" class="swatch"></div>${outputArea("Border radius CSS")}`;
      case "gradient":
        return `<div class="inline-grid three">${field("Start", "start", "#1f6feb", "color")}${field("End", "end", "#f85149", "color")}${field("Angle", "angle", "135", "number")}</div><div class="tool-actions">${action("Generate", "generate", true)}</div><div id="swatch" class="swatch"></div>${outputArea("Gradient CSS")}`;
      case "svg-optimizer":
        return textTool("SVG", "Optimized SVG", '<svg width="100" height="100"><!-- demo --><rect width="100" height="100" fill="#111318" /></svg>') + `<div class="tool-actions">${action("Optimize", "optimize", true)}</div>`;
      case "image-converter":
        return `<div class="inline-grid three">${selectField("Format", "format", [{ value: "image/png", label: "PNG" }, { value: "image/jpeg", label: "JPEG" }, { value: "image/webp", label: "WebP" }])}${field("Quality", "quality", "0.86", "number")}<div class="inline-field"><label>Image</label><label class="file-input-label"><i class="fa fa-upload"></i>Choose File<input id="imageFile" class="file-input" type="file" accept="image/*"></label></div></div><div class="tool-actions">${action("Convert", "convert", true)}<a id="downloadImage" class="tool-action hidden" download="converted-image"><i class="fa fa-download"></i>Download</a></div><img id="imagePreview" class="image-preview hidden" alt="Image preview">${outputArea("Image result")}`;
      case "http-status":
        return `<div class="inline-grid two">${field("Status Code", "code", "404", "number")}${field("Search", "search", "")}</div><div class="tool-actions">${action("Lookup", "lookup", true)}</div><div id="output" class="result-list"></div>`;
      case "mime":
        return `<div class="inline-grid two">${field("Extension or MIME", "query", ".json")}${field("Search", "search", "")}</div><div class="tool-actions">${action("Lookup", "lookup", true)}</div><div id="output" class="result-list"></div>`;
      case "user-agent":
        return textTool("User Agent", "Parsed", navigator.userAgent) + `<div class="tool-actions">${action("Parse", "parse", true)}</div>`;
      default:
        return textTool();
    }
  }

  function setupFor(id) {
    const autoRun = () => {
      const primary = $(".tool-action.primary");
      if (primary) primary.click();
    };
    switch (id) {
      case "json-format":
        bind("format", "click", () => setOutput(JSON.stringify(JSON.parse($("#input").value), null, 2)));
        bind("minify", "click", () => setOutput(JSON.stringify(JSON.parse($("#input").value))));
        bind("sortKeys", "click", () => setOutput(JSON.stringify(sortObject(JSON.parse($("#input").value)), null, 2)));
        break;
      case "json-escape":
        bind("escape", "click", () => setOutput(JSON.stringify($("#input").value)));
        bind("unescape", "click", () => setOutput(JSON.parse($("#input").value)));
        break;
      case "json-yaml":
        bind("jsonToYaml", "click", () => setOutput(toYaml(JSON.parse($("#input").value))));
        bind("yamlToJson", "click", () => setOutput(JSON.stringify(parseYamlBasic($("#input").value), null, 2)));
        break;
      case "json-csv":
        bind("jsonToCsv", "click", () => setOutput(jsonToCsv(JSON.parse($("#input").value))));
        bind("csvToJson", "click", () => setOutput(JSON.stringify(csvToJson($("#input").value), null, 2)));
        break;
      case "csv-clean":
        bind("format", "click", () => setOutput(csvRows($("#input").value).map((row) => row.map(csvCell).join(",")).join("\n")));
        break;
      case "base64":
        bind("encode", "click", () => setOutput(btoa(unescape(encodeURIComponent($("#input").value)))));
        bind("decode", "click", () => setOutput(decodeURIComponent(escape(atob($("#input").value.trim())))));
        break;
      case "url-codec":
        bind("encode", "click", () => setOutput(encodeURIComponent($("#input").value)));
        bind("decode", "click", () => setOutput(decodeURIComponent($("#input").value)));
        break;
      case "query":
        bind("parse", "click", () => setOutput(JSON.stringify(parseQuery($("#input").value), null, 2)));
        bind("build", "click", () => setOutput(buildQuery(JSON.parse($("#input").value))));
        break;
      case "html-entity":
        bind("encode", "click", () => setOutput(escapeHtml($("#input").value)));
        bind("decode", "click", () => setOutput(decodeEntities($("#input").value)));
        break;
      case "jwt":
        bind("decode", "click", decodeJwt);
        break;
      case "totp":
        bind("newSecret", "click", () => { $("#secret").value = randomBase32(20); updateTotp(); });
        bind("refresh", "click", updateTotp);
        ["secret", "account", "issuer", "digits"].forEach((item) => bind(item, "input", updateTotp));
        updateTotp();
        state.timers.push(setInterval(updateTotp, 1000));
        return;
      case "hash":
        bind("generate", "click", generateHashes);
        break;
      case "md5":
        bind("generate", "click", () => setOutput(md5($("#input").value)));
        break;
      case "hmac":
        bind("generate", "click", generateHmac);
        break;
      case "password":
        bind("generate", "click", generatePasswords);
        break;
      case "timestamp":
        bind("toDate", "click", unixToDate);
        bind("toUnix", "click", dateToUnix);
        bind("now", "click", () => { $("#unix").value = Math.floor(Date.now() / 1000); unixToDate(); });
        break;
      case "timezone":
        bind("convert", "click", convertTimezone);
        break;
      case "uuid":
        bind("generate", "click", () => setOutput(repeatCount($("#count").value).map(() => crypto.randomUUID()).join("\n")));
        break;
      case "ulid":
        bind("generate", "click", () => setOutput(repeatCount($("#count").value).map(() => $("#prefix").value + ulid()).join("\n")));
        break;
      case "random-string":
        bind("generate", "click", generateRandomStrings);
        break;
      case "lorem":
        bind("generate", "click", generateLorem);
        break;
      case "slug":
        bind("generate", "click", () => setOutput(slugify($("#input").value)));
        break;
      case "case":
        bind("convert", "click", convertCase);
        break;
      case "qr":
        bind("generate", "click", () => makeQr($("#input").value, "#qrTarget"));
        break;
      case "favicon":
        bind("generate", "click", generateFavicon);
        break;
      case "pwa":
        bind("generate", "click", generatePwa);
        break;
      case "meta":
        bind("generate", "click", generateMeta);
        break;
      case "robots":
        bind("generate", "click", generateRobots);
        break;
      case "sitemap":
        bind("generate", "click", generateSitemap);
        break;
      case "gitignore":
        bind("generate", "click", generateGitignore);
        break;
      case "regex":
        bind("test", "click", testRegex);
        break;
      case "diff":
        bind("compare", "click", compareText);
        break;
      case "markdown":
        bind("preview", "click", () => setOutput(markdownToHtml($("#input").value)));
        break;
      case "html-format":
        bind("beautify", "click", () => setOutput(formatHtml($("#input").value)));
        bind("minify", "click", () => setOutput($("#input").value.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim()));
        break;
      case "css-format":
        bind("beautify", "click", () => setOutput(formatCss($("#input").value)));
        bind("minify", "click", () => setOutput($("#input").value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").trim()));
        break;
      case "js-format":
        bind("beautify", "click", () => setOutput(formatJs($("#input").value)));
        bind("minify", "click", () => setOutput($("#input").value.replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();,:=+\-*/<>])\s*/g, "$1").trim()));
        break;
      case "sql-format":
        bind("format", "click", () => setOutput(formatSql($("#input").value)));
        break;
      case "cron":
        bind("explain", "click", explainCron);
        break;
      case "docker-compose":
        bind("validate", "click", validateCompose);
        break;
      case "color":
        bind("colorInput", "input", () => { $("#hex").value = $("#colorInput").value; convertColor(); });
        bind("hex", "input", convertColor);
        bind("alpha", "input", convertColor);
        bind("convert", "click", convertColor);
        break;
      case "contrast":
        bind("check", "click", checkContrast);
        bind("fg", "input", checkContrast);
        bind("bg", "input", checkContrast);
        break;
      case "css-unit":
        bind("convert", "click", convertCssUnit);
        break;
      case "css-clamp":
        bind("generate", "click", generateClamp);
        break;
      case "box-shadow":
        bind("generate", "click", generateBoxShadow);
        break;
      case "radius":
        bind("generate", "click", generateRadius);
        break;
      case "gradient":
        bind("generate", "click", generateGradient);
        break;
      case "svg-optimizer":
        bind("optimize", "click", optimizeSvg);
        break;
      case "image-converter":
        bind("convert", "click", convertImage);
        bind("imageFile", "change", previewImage);
        return;
      case "http-status":
        bind("lookup", "click", lookupStatus);
        break;
      case "mime":
        bind("lookup", "click", lookupMime);
        break;
      case "user-agent":
        bind("parse", "click", parseUserAgent);
        break;
    }
    try { autoRun(); } catch (error) { setOutput(error.message); }
  }

  function repeatCount(value) {
    const count = Math.max(1, Math.min(100, Number(value) || 1));
    return Array.from({ length: count });
  }

  function sortObject(value) {
    if (Array.isArray(value)) return value.map(sortObject);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((next, key) => {
        next[key] = sortObject(value[key]);
        return next;
      }, {});
    }
    return value;
  }

  function toYaml(value, indent = 0) {
    const pad = "  ".repeat(indent);
    if (Array.isArray(value)) {
      return value.map((item) => `${pad}- ${typeof item === "object" && item !== null ? "\n" + toYaml(item, indent + 1) : yamlScalar(item)}`).join("\n");
    }
    if (value && typeof value === "object") {
      return Object.keys(value).map((key) => {
        const item = value[key];
        return `${pad}${key}: ${typeof item === "object" && item !== null ? "\n" + toYaml(item, indent + 1) : yamlScalar(item)}`;
      }).join("\n");
    }
    return `${pad}${yamlScalar(value)}`;
  }

  function yamlScalar(value) {
    if (typeof value === "string") return /^[\w .:/-]+$/.test(value) ? value : JSON.stringify(value);
    return String(value);
  }

  function parseYamlBasic(input) {
    const result = {};
    input.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^:#]+):\s*(.*)$/);
      if (!match) return;
      const key = match[1].trim();
      const raw = match[2].trim();
      result[key] = raw === "" ? null : parseScalar(raw);
    });
    return result;
  }

  function parseScalar(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (!Number.isNaN(Number(value)) && value !== "") return Number(value);
    return value.replace(/^["']|["']$/g, "");
  }

  function csvRows(input) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i++;
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.length > 1 || row[0]) rows.push(row);
    return rows;
  }

  function csvCell(value) {
    const text = String(value ?? "").trim();
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function jsonToCsv(value) {
    const rows = Array.isArray(value) ? value : [value];
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
    return [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n");
  }

  function csvToJson(input) {
    const rows = csvRows(input);
    const headers = rows.shift() || [];
    return rows.map((row) => headers.reduce((obj, key, index) => {
      obj[key] = row[index] ?? "";
      return obj;
    }, {}));
  }

  function parseQuery(value) {
    const query = value.includes("?") ? value.split("?")[1] : value;
    return Array.from(new URLSearchParams(query.replace(/^#/, ""))).reduce((obj, item) => {
      const [key, val] = item;
      if (obj[key] !== undefined) obj[key] = Array.isArray(obj[key]) ? [...obj[key], val] : [obj[key], val];
      else obj[key] = val;
      return obj;
    }, {});
  }

  function buildQuery(obj) {
    const params = new URLSearchParams();
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
      else params.set(key, value);
    });
    return params.toString();
  }

  function decodeEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return decodeURIComponent(escape(atob(normalized)));
  }

  function decodeJwt() {
    const token = $("#input").value.trim();
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("JWT must contain header and payload.");
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const claims = {};
    ["iat", "nbf", "exp"].forEach((key) => {
      if (payload[key]) claims[key] = new Date(payload[key] * 1000).toISOString();
    });
    setOutput(JSON.stringify({ header, payload, readableClaims: claims, signaturePresent: Boolean(parts[2]) }, null, 2));
  }

  async function updateTotp() {
    const secret = $("#secret").value.replace(/\s+/g, "").toUpperCase();
    const digits = Number($("#digits").value) || 6;
    const period = 30;
    const epoch = Math.floor(Date.now() / 1000);
    const remaining = period - (epoch % period);
    $("#totpTimer").textContent = `${remaining}s remaining`;
    try {
      const code = await totp(secret, digits, period);
      $("#totpCode").textContent = code;
      const issuer = $("#issuer").value.trim();
      const account = $("#account").value.trim();
      const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${digits}&period=${period}`;
      setOutput(uri);
      makeQr(uri, "#qrTarget");
    } catch (error) {
      $("#totpCode").textContent = "------";
      setOutput(error.message);
    }
  }

  async function totp(secret, digits, period) {
    const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const counter = Math.floor(Date.now() / 1000 / period);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, counter);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
    const offset = hmac[hmac.length - 1] & 15;
    const binary = ((hmac[offset] & 127) << 24) | ((hmac[offset + 1] & 255) << 16) | ((hmac[offset + 2] & 255) << 8) | (hmac[offset + 3] & 255);
    return String(binary % (10 ** digits)).padStart(digits, "0");
  }

  function base32Decode(value) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    value.replace(/=+$/, "").split("").forEach((char) => {
      const index = alphabet.indexOf(char);
      if (index === -1) throw new Error("Invalid Base32 secret.");
      bits += index.toString(2).padStart(5, "0");
    });
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
    return new Uint8Array(bytes);
  }

  function randomBase32(length) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  async function digestHex(algorithm, input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest(algorithm, data);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function generateHashes() {
    const input = $("#input").value;
    const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
    const rows = await Promise.all(algorithms.map(async (algorithm) => `${algorithm}: ${await digestHex(algorithm, input)}`));
    setOutput(rows.join("\n"));
  }

  async function generateHmac() {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode($("#secret").value), { name: "HMAC", hash: $("#algorithm").value }, false, ["sign"]);
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode($("#input").value));
    setOutput(Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join(""));
  }

  function securePick(chars, length) {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  }

  function generatePasswords() {
    const words = "amber brave cedar delta ember frost graphite harbor island jade kernel lunar matrix north orbit pixel quartz river solar timber umber vector willow xenon yellow zenith".split(" ");
    const mode = $("#mode").value;
    const count = Number($("#count").value) || 6;
    const length = Number($("#length").value) || 24;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    const lines = repeatCount(count).map(() => {
      if (mode === "passphrase") return repeatCount(Math.max(3, Math.round(length / 6))).map(() => words[Math.floor(cryptoRandom() * words.length)]).join($("#separator").value);
      return securePick(chars, length);
    });
    setOutput(lines.join("\n"));
  }

  function cryptoRandom() {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }

  function unixToDate() {
    const unit = $("#unit").value;
    const raw = Number($("#unix").value);
    const ms = unit === "milliseconds" ? raw : raw * 1000;
    const date = new Date(ms);
    setOutput(`ISO: ${date.toISOString()}\nLocal: ${date.toLocaleString()}\nUTC: ${date.toUTCString()}`);
  }

  function dateToUnix() {
    const ms = new Date($("#datetime").value).getTime();
    setOutput(`Seconds: ${Math.floor(ms / 1000)}\nMilliseconds: ${ms}`);
  }

  function convertTimezone() {
    const date = new Date($("#datetime").value);
    const zones = [$("#fromTz").value, $("#toTz").value, "UTC", Intl.DateTimeFormat().resolvedOptions().timeZone];
    const unique = Array.from(new Set(zones.filter(Boolean)));
    setOutput(unique.map((zone) => `${zone}: ${date.toLocaleString("en-US", { timeZone: zone, dateStyle: "full", timeStyle: "long" })}`).join("\n"));
  }

  function ulid() {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    let time = Date.now();
    let out = "";
    for (let i = 0; i < 10; i++) {
      out = alphabet[time % 32] + out;
      time = Math.floor(time / 32);
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % 32];
    return out;
  }

  function generateRandomStrings() {
    const chars = $("#chars").value || "abcdefghijklmnopqrstuvwxyz0123456789";
    const length = Number($("#length").value) || 32;
    setOutput(repeatCount($("#count").value).map(() => $("#prefix").value + securePick(chars, length)).join("\n"));
  }

  function generateLorem() {
    const words = "lorem ipsum dolor sit amet consectetur adipiscing elit integer posuere erat ante venenatis dapibus posuere velit aliquet curabitur blandit tempus porttitor".split(" ");
    const paragraphs = Number($("#paragraphs").value) || 3;
    const sentences = Number($("#sentences").value) || 4;
    const blocks = repeatCount(paragraphs).map(() => repeatCount(sentences).map(() => {
      const sentence = repeatCount(10).map(() => words[Math.floor(cryptoRandom() * words.length)]).join(" ");
      return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
    }).join(" "));
    setOutput($("#format").value === "html" ? blocks.map((item) => `<p>${item}</p>`).join("\n") : blocks.join("\n\n"));
  }

  function slugify(value) {
    return value.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function words(value) {
    return value.trim().replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean).map((word) => word.toLowerCase());
  }

  function convertCase() {
    const list = words($("#input").value);
    const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1);
    setOutput([
      `camelCase: ${list[0] || ""}${list.slice(1).map(cap).join("")}`,
      `PascalCase: ${list.map(cap).join("")}`,
      `snake_case: ${list.join("_")}`,
      `kebab-case: ${list.join("-")}`,
      `CONSTANT_CASE: ${list.join("_").toUpperCase()}`,
      `Title Case: ${list.map(cap).join(" ")}`
    ].join("\n"));
  }

  function makeQr(value, selector) {
    const target = $(selector);
    if (!target) return;
    if (!window.qrcode) {
      target.innerHTML = `<div class="output-box">QR library unavailable.</div>`;
      return;
    }
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    target.innerHTML = qr.createImgTag(6, 8);
    setOutput(value);
  }

  function generateFavicon() {
    const canvas = $("#iconCanvas");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = $("#bg").value;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = $("#fg").value;
    ctx.font = "bold 156px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText($("#text").value.slice(0, 2), 128, 138);
    const url = canvas.toDataURL("image/png");
    $("#downloadIcon").href = url;
    $("#downloadIcon").classList.remove("hidden");
    setOutput(`<link rel="icon" type="image/png" href="/favicon.png">`);
  }

  function generatePwa() {
    const manifest = {
      name: $("#name").value,
      short_name: $("#shortName").value,
      start_url: $("#startUrl").value,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: $("#theme").value,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    };
    setOutput(JSON.stringify(manifest, null, 2));
  }

  function generateMeta() {
    const title = escapeHtml($("#title").value);
    const description = escapeHtml($("#description").value);
    const url = escapeHtml($("#url").value);
    const image = escapeHtml($("#image").value);
    setOutput(`<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">`);
  }

  function generateRobots() {
    const lines = ["User-agent: *"];
    lines.push($("#robotsMode").value === "allow" ? "Allow: /" : "Disallow: /");
    if ($("#delay").value) lines.push(`Crawl-delay: ${$("#delay").value}`);
    if ($("#sitemap").value) lines.push(`Sitemap: ${$("#sitemap").value}`);
    setOutput(lines.join("\n"));
  }

  function generateSitemap() {
    const urls = $("#input").value.split(/\s+/).filter(Boolean);
    setOutput(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}
</urlset>`);
  }

  function gitignoreOptions() {
    return Object.keys(gitignoreTemplates).map((key) => ({ value: key, label: key })).map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
  }

  const gitignoreTemplates = {
    Node: "node_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\ndist/\nbuild/\n.env\n",
    Go: "bin/\n*.test\n*.out\nvendor/\n.env\n",
    Python: "__pycache__/\n*.py[cod]\n.venv/\nvenv/\ndist/\n.env\n",
    PHP: "vendor/\n.env\n.phpunit.result.cache\ncomposer.lock\n",
    Java: "target/\n.gradle/\nbuild/\n*.class\n",
    Static: ".DS_Store\nThumbs.db\n.env\n.cache/\n"
  };

  function generateGitignore() {
    const body = gitignoreTemplates[$("#template").value] || "";
    const extra = $("#extra").value.trim();
    setOutput(`${body}${extra ? "\n" + extra + "\n" : ""}`);
  }

  function testRegex() {
    const regex = new RegExp($("#pattern").value, $("#flags").value);
    const text = $("#input").value;
    const matches = Array.from(text.matchAll(regex.global ? regex : new RegExp(regex.source, regex.flags + "g")));
    setOutput(`<p>${matches.length} match(es)</p><pre>${escapeHtml(matches.map((match, index) => `${index + 1}. ${match[0]} ${match.index !== undefined ? `@${match.index}` : ""}${match.length > 1 ? ` groups=${JSON.stringify(match.slice(1))}` : ""}`).join("\n"))}</pre>`);
  }

  function compareText() {
    const left = $("#left").value.split(/\r?\n/);
    const right = $("#right").value.split(/\r?\n/);
    const max = Math.max(left.length, right.length);
    const out = [];
    for (let i = 0; i < max; i++) {
      if (left[i] === right[i]) out.push(`  ${left[i] ?? ""}`);
      else {
        if (left[i] !== undefined) out.push(`- ${left[i]}`);
        if (right[i] !== undefined) out.push(`+ ${right[i]}`);
      }
    }
    setOutput(out.join("\n"));
  }

  function markdownToHtml(input) {
    const lines = escapeHtml(input).split(/\r?\n/);
    let inList = false;
    const out = [];
    lines.forEach((line) => {
      if (/^###\s+/.test(line)) out.push(`<h3>${line.replace(/^###\s+/, "")}</h3>`);
      else if (/^##\s+/.test(line)) out.push(`<h2>${line.replace(/^##\s+/, "")}</h2>`);
      else if (/^#\s+/.test(line)) out.push(`<h1>${line.replace(/^#\s+/, "")}</h1>`);
      else if (/^-\s+/.test(line)) {
        if (!inList) out.push("<ul>");
        inList = true;
        out.push(`<li>${line.replace(/^-\s+/, "")}</li>`);
      } else {
        if (inList) out.push("</ul>");
        inList = false;
        if (line.trim()) out.push(`<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>")}</p>`);
      }
    });
    if (inList) out.push("</ul>");
    return out.join("\n");
  }

  function formatHtml(input) {
    let level = 0;
    return input.replace(/>\s*</g, ">\n<").split("\n").map((line) => {
      if (/^<\/.+>/.test(line)) level = Math.max(0, level - 1);
      const out = "  ".repeat(level) + line.trim();
      if (/^<[^!?/][^>]*[^/]?>$/.test(line) && !/^<[^>]+>.*<\/[^>]+>$/.test(line)) level++;
      return out;
    }).join("\n");
  }

  function formatCss(input) {
    return input.replace(/\s*{\s*/g, " {\n  ").replace(/;\s*/g, ";\n  ").replace(/\s*}\s*/g, "\n}\n").replace(/,\s*/g, ",\n").trim();
  }

  function formatJs(input) {
    let level = 0;
    return input.replace(/([{};])/g, "$1\n").split("\n").map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("}")) level = Math.max(0, level - 1);
      const out = "  ".repeat(level) + trimmed;
      if (trimmed.endsWith("{")) level++;
      return out;
    }).filter(Boolean).join("\n");
  }

  function formatSql(input) {
    const keywords = ["select", "from", "where", "group by", "order by", "having", "limit", "inner join", "left join", "right join", "join", "and", "or"];
    let sql = input.replace(/\s+/g, " ").trim();
    keywords.forEach((keyword) => {
      sql = sql.replace(new RegExp(`\\b${keyword}\\b`, "gi"), `\n${keyword.toUpperCase()}`);
    });
    return sql.replace(/^\n/, "").replace(/,\s*/g, ",\n  ");
  }

  function explainCron() {
    const parts = $("#cron").value.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error("Cron must have 5 fields.");
    const names = ["Minute", "Hour", "Day of month", "Month", "Day of week"];
    setOutput(parts.map((part, index) => `${names[index]}: ${explainCronPart(part)}`).join("\n"));
  }

  function explainCronPart(part) {
    if (part === "*") return "every value";
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      return `every ${step} in ${range === "*" ? "all values" : range}`;
    }
    if (part.includes("-")) return `range ${part}`;
    if (part.includes(",")) return `values ${part}`;
    return `value ${part}`;
  }

  function validateCompose() {
    const text = $("#input").value;
    const errors = [];
    if (!/^services:\s*$/m.test(text)) errors.push("Missing top-level services.");
    if (!/\n\s{2}[A-Za-z0-9_-]+:\s*$/m.test(text)) errors.push("No service name found under services.");
    if (!/(image|build):\s*\S+/m.test(text)) errors.push("Each service usually needs image or build.");
    setOutput(errors.length ? errors.join("\n") : "Looks valid for a basic Compose file.");
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean;
    const number = parseInt(full, 16);
    return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function convertColor() {
    const hex = $("#hex").value || $("#colorInput").value;
    const rgb = hexToRgb(hex);
    $("#swatch").style.background = hex;
    const alpha = Number($("#alpha").value || 1);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setOutput(`HEX: ${rgbToHex(rgb.r, rgb.g, rgb.b)}
RGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})
RGBA: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})
HSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)
OKLCH approximation: oklch(${(hsl.l / 100).toFixed(2)} 0.12 ${hsl.h})`);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      if (max === g) h = (b - r) / d + 2;
      if (max === b) h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return [r, g, b].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  }

  function checkContrast() {
    const fg = $("#fg").value;
    const bg = $("#bg").value;
    const ratio = (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05);
    $("#swatch").style.background = bg;
    $("#swatch").style.color = fg;
    $("#swatch").style.display = "grid";
    $("#swatch").style.placeItems = "center";
    $("#swatch").textContent = "Aa";
    setOutput(`Ratio: ${ratio.toFixed(2)}:1\nAA Normal: ${ratio >= 4.5 ? "Pass" : "Fail"}\nAA Large: ${ratio >= 3 ? "Pass" : "Fail"}\nAAA Normal: ${ratio >= 7 ? "Pass" : "Fail"}`);
  }

  function convertCssUnit() {
    const px = Number($("#px").value) || 0;
    const root = Number($("#root").value) || 16;
    const parent = Number($("#parent").value) || root;
    const viewport = Number($("#viewport").value) || 1440;
    setOutput(`${px}px
${px / root}rem
${px / parent}em
${(px / viewport) * 100}vw`);
  }

  function generateClamp() {
    const minSize = Number($("#minSize").value);
    const maxSize = Number($("#maxSize").value);
    const minWidth = Number($("#minWidth").value);
    const maxWidth = Number($("#maxWidth").value);
    const slope = (maxSize - minSize) / (maxWidth - minWidth);
    const intercept = minSize - slope * minWidth;
    setOutput(`clamp(${minSize / 16}rem, ${(intercept / 16).toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${maxSize / 16}rem);`);
  }

  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function generateBoxShadow() {
    const value = `${$("#x").value}px ${$("#y").value}px ${$("#blur").value}px ${$("#spread").value}px ${hexToRgba($("#color").value, $("#alpha").value)}`;
    $("#swatch").style.boxShadow = value;
    $("#swatch").style.background = "#e7ecf8";
    setOutput(`box-shadow: ${value};`);
  }

  function generateRadius() {
    const value = `${$("#tl").value}px ${$("#tr").value}px ${$("#br").value}px ${$("#bl").value}px`;
    $("#swatch").style.background = "#e7ecf8";
    $("#swatch").style.borderRadius = value;
    setOutput(`border-radius: ${value};`);
  }

  function generateGradient() {
    const value = `linear-gradient(${$("#angle").value}deg, ${$("#start").value}, ${$("#end").value})`;
    $("#swatch").style.background = value;
    setOutput(`background: ${value};`);
  }

  function optimizeSvg() {
    const input = $("#input").value;
    const output = input.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
    const saved = input.length ? Math.round((1 - output.length / input.length) * 100) : 0;
    setOutput(`${output}\n\n<!-- Saved ${saved}% -->`);
  }

  let selectedImage = null;
  function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    selectedImage = file;
    const url = URL.createObjectURL(file);
    $("#imagePreview").src = url;
    $("#imagePreview").classList.remove("hidden");
  }

  function convertImage() {
    if (!selectedImage) throw new Error("Choose an image first.");
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const format = $("#format").value;
      const data = canvas.toDataURL(format, Number($("#quality").value) || 0.86);
      const link = $("#downloadImage");
      link.href = data;
      link.download = `converted-image.${format.split("/")[1]}`;
      link.classList.remove("hidden");
      setOutput(`Width: ${canvas.width}px\nHeight: ${canvas.height}px\nFormat: ${format}`);
    };
    image.src = URL.createObjectURL(selectedImage);
  }

  const statuses = {
    100: "Continue", 101: "Switching Protocols", 200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 301: "Moved Permanently", 302: "Found", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 422: "Unprocessable Content", 429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout"
  };

  function lookupStatus() {
    const query = ($("#search").value || $("#code").value).toLowerCase();
    const rows = Object.entries(statuses).filter(([code, text]) => code.includes(query) || text.toLowerCase().includes(query));
    setOutput(`<table><tbody>${rows.map(([code, text]) => `<tr><th>${code}</th><td>${text}</td></tr>`).join("")}</tbody></table>`);
  }

  const mimes = {
    ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".zip": "application/zip", ".csv": "text/csv", ".txt": "text/plain", ".wasm": "application/wasm"
  };

  function lookupMime() {
    const query = ($("#search").value || $("#query").value).toLowerCase();
    const rows = Object.entries(mimes).filter(([ext, mime]) => ext.includes(query) || mime.includes(query));
    setOutput(`<table><tbody>${rows.map(([ext, mime]) => `<tr><th>${ext}</th><td>${mime}</td></tr>`).join("")}</tbody></table>`);
  }

  function parseUserAgent() {
    const ua = $("#input").value;
    const browser = ua.includes("Firefox") ? "Firefox" : ua.includes("Edg") ? "Edge" : ua.includes("Chrome") ? "Chrome" : ua.includes("Safari") ? "Safari" : "Unknown";
    const os = ua.includes("Windows") ? "Windows" : ua.includes("Mac OS") ? "macOS" : ua.includes("Linux") ? "Linux" : ua.includes("Android") ? "Android" : ua.includes("iPhone") ? "iOS" : "Unknown";
    const device = /Mobile|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";
    setOutput(`Browser: ${browser}\nOS: ${os}\nDevice: ${device}\nRaw: ${ua}`);
  }

  function md5(input) {
    function rotateLeft(value, shift) { return (value << shift) | (value >>> (32 - shift)); }
    function add(x, y) { return (((x & 0xffff) + (y & 0xffff)) & 0xffff) | ((((x >>> 16) + (y >>> 16) + (((x & 0xffff) + (y & 0xffff)) >>> 16)) & 0xffff) << 16); }
    function cmn(q, a, b, x, s, t) { return add(rotateLeft(add(add(a, q), add(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function wordsFromString(str) {
      const bytes = unescape(encodeURIComponent(str));
      const output = [];
      for (let i = 0; i < bytes.length * 8; i += 8) output[i >> 5] |= (bytes.charCodeAt(i / 8) & 255) << (i % 32);
      output[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
      output[(((bytes.length + 8) >> 6) + 1) * 16 - 2] = bytes.length * 8;
      return output;
    }
    const x = wordsFromString(input);
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d;
      a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426); c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632); c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
      a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784); c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222); c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606); c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = add(a, olda); b = add(b, oldb); c = add(c, oldc); d = add(d, oldd);
    }
    return [a, b, c, d].map((num) => {
      let out = "";
      for (let i = 0; i < 4; i++) out += ((num >> (i * 8)) & 255).toString(16).padStart(2, "0");
      return out;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#toolCount").textContent = tools.length;
    renderToolSelect();
    renderNav();
    $("#toolSearch").addEventListener("input", (event) => {
      renderNav(event.target.value);
      renderToolSelect(event.target.value);
    });
    $("#toolSelect").addEventListener("change", (event) => {
      if (event.target.value) selectTool(event.target.value);
    });
    $("#copyOutput").addEventListener("click", async () => {
      const text = getOutput();
      if (text) await navigator.clipboard.writeText(text);
    });
    selectTool(state.activeId);
  });
})();
