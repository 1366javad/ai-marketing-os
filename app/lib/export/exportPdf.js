import { jsPDF } from "jspdf";
import { cleanMarkdown } from "./cleanMarkdown.js";

const PAGE = {
  marginX: 16,
  top: 18,
  bottom: 18,
  width: 178,
};

const SECTION_TITLES = new Set([
  "summary",
  "concept",
  "headlines",
  "primary text",
  "descriptions",
  "ctas",
  "extensions",
  "hooks",
  "script ideas",
  "insights",
  "recommendations",
  "risks",
  "next actions",
  "keywords",
  "visual notes",
]);

export function exportPdf(title, content) {
  const doc = buildPdfDocument(title, content);
  doc.save(`${sanitizeFileName(title)}.pdf`);
}

export function buildPdfDocument(title, content) {
  const doc = new jsPDF();
  let y = PAGE.top;

  doc.setTextColor(24, 33, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  y = writeWrappedText(doc, title, y, {
    fontSize: 18,
    fontStyle: "bold",
    lineHeight: 8,
  });
  y += 4;

  const blocks = parsePdfBlocks(content);

  for (const block of blocks) {
    if (block.type === "space") {
      y += 3;
      continue;
    }

    if (block.type === "heading") {
      y = ensureSpace(doc, y, 13);
      y += 3;
      doc.setTextColor(24, 33, 52);
      y = writeWrappedText(doc, block.text, y, {
        fontSize: 13,
        fontStyle: "bold",
        lineHeight: 6,
      });
      y += 1.5;
      continue;
    }

    if (block.type === "metadata") {
      y = ensureSpace(doc, y, 7);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`${block.label}:`, PAGE.marginX, y);
      const labelWidth = doc.getTextWidth(`${block.label}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      y = writeWrappedText(doc, block.value, y, {
        x: PAGE.marginX + labelWidth,
        width: PAGE.width - labelWidth,
        fontSize: 10,
        fontStyle: "normal",
        lineHeight: 5,
      });
      y += 1;
      continue;
    }

    const bulletOffset = block.type === "bullet" ? 5 : 0;
    const lines = doc.splitTextToSize(
      block.text,
      PAGE.width - bulletOffset,
    );
    const requiredHeight = Math.max(1, lines.length) * 5.5;
    y = ensureSpace(doc, y, requiredHeight);

    if (block.type === "bullet") {
      doc.setFillColor(59, 60, 255);
      doc.circle(PAGE.marginX + 1.5, y - 1.3, 0.8, "F");
    }

    doc.setTextColor(51, 65, 85);
    y = writeWrappedText(doc, block.text, y, {
      x: PAGE.marginX + bulletOffset,
      width: PAGE.width - bulletOffset,
      fontSize: 10.5,
      fontStyle: "normal",
      lineHeight: 5.5,
    });
    y += 1.5;
  }

  return doc;
}

function parsePdfBlocks(content) {
  const lines = String(content || "").split(/\r?\n/);

  return lines.map((rawLine) => {
    const line = rawLine.trim();
    if (!line) return { type: "space", text: "" };

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      return {
        type: "heading",
        text: cleanMarkdown(heading[1]),
      };
    }

    const metadata = cleanMarkdown(line).match(
      /^(Campaign|Module|Output Type|Status|Generated At|Provider):\s*(.*)$/i,
    );
    if (metadata) {
      return {
        type: "metadata",
        label: metadata[1],
        value: metadata[2] || "Not recorded",
      };
    }

    if (/^[-*]\s+/.test(line)) {
      return {
        type: "bullet",
        text: cleanMarkdown(line.replace(/^[-*]\s+/, "")),
      };
    }

    const plainLine = cleanMarkdown(line);
    const normalized = plainLine.replace(/:$/, "").toLowerCase();
    if (SECTION_TITLES.has(normalized)) {
      return {
        type: "heading",
        text: plainLine.replace(/:$/, ""),
      };
    }

    return { type: "paragraph", text: plainLine };
  });
}

function writeWrappedText(
  doc,
  text,
  y,
  {
    x = PAGE.marginX,
    width = PAGE.width,
    fontSize = 10.5,
    fontStyle = "normal",
    lineHeight = 5.5,
  } = {},
) {
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(String(text || ""), width);

  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }

  return y;
}

function ensureSpace(doc, y, requiredHeight) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight <= pageHeight - PAGE.bottom) return y;

  doc.addPage();
  return PAGE.top;
}

function sanitizeFileName(value) {
  return String(value || "campaign-asset")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();
}
