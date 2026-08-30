document.addEventListener("DOMContentLoaded", () => {
  const resume = document.querySelector("[data-resume-content]");

  if (!resume) {
    return;
  }

  const linkPattern = /(https?:\/\/[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  const textNodes = [];
  const walker = document.createTreeWalker(resume, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    const parent = currentNode.parentElement;

    if (parent && !parent.closest("a, code, script, style") && linkPattern.test(currentNode.nodeValue)) {
      textNodes.push(currentNode);
    }

    linkPattern.lastIndex = 0;
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    textNode.nodeValue.replace(linkPattern, (matchedText, _capture, offset) => {
      let linkText = matchedText;
      let trailingPunctuation = "";

      while (/[,.;:!?)]$/.test(linkText)) {
        trailingPunctuation = linkText.slice(-1) + trailingPunctuation;
        linkText = linkText.slice(0, -1);
      }

      fragment.append(document.createTextNode(textNode.nodeValue.slice(cursor, offset)));

      const link = document.createElement("a");
      const isWebLink = /^https?:\/\//i.test(linkText);
      link.href = isWebLink ? linkText : `mailto:${linkText}`;
      link.textContent = linkText;

      if (isWebLink) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      fragment.append(link);
      fragment.append(document.createTextNode(trailingPunctuation));
      cursor = offset + matchedText.length;
      return matchedText;
    });

    fragment.append(document.createTextNode(textNode.nodeValue.slice(cursor)));
    textNode.replaceWith(fragment);
    linkPattern.lastIndex = 0;
  });
});
