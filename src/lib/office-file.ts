import { pdfBytes } from "./office-pdf";
import { zipStore } from "./zip-store";

export type OfficeKind = "pdf" | "docx" | "xlsx" | "pptx";

export type OfficeFile = {
  kind: OfficeKind;
  name: string;
  mime: string;
  bytes: Uint8Array;
};

const MIME: Record<OfficeKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function xml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileName(title: string, ext: string): string {
  const clean = title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${clean || "dokument"}.${ext}`;
}

function paragraphs(text: string): string[] {
  const rows = text.split(/\n+/).map((row) => row.trim()).filter(Boolean);
  return (rows.length ? rows : [text.trim() || "Пусто"]).slice(0, 40);
}

function table(text: string): string[][] {
  const lines = text.split(/\n+/).map((row) => row.trim()).filter((row) => row && !/^\|?\s*-+/.test(row));
  const split = (row: string) => row.split(/\t|\s*\|\s*|;\s*|,\s*/).map((cell) => cell.trim()).filter(Boolean).slice(0, 8);
  const rows = lines.map(split).filter((row) => row.length > 1);
  if (rows.length) return rows.slice(0, 40);
  return paragraphs(text).map((row) => [row]);
}

export function officeKind(phrase: string): OfficeKind {
  if (/(?<![\p{L}])(?:pptx|презентац)/iu.test(phrase)) return "pptx";
  if (/(?<![\p{L}])(?:xlsx|таблиц)/iu.test(phrase)) return "xlsx";
  if (/(?<![\p{L}])pdf(?![\p{L}])/iu.test(phrase)) return "pdf";
  return "docx";
}

function bodyOf(phrase: string): string {
  const stripped = phrase
    .split(/\n/)
    .map((line) => line
      .replace(/(?<![\p{L}])(?:созда(?:й|ть|йте)|напиш(?:и|ите)|сдела(?:й|ть|йте)|собери|собрать)(?![\p{L}])/giu, "")
      .replace(/(?<![\p{L}])(?:pdf|docx|xlsx|pptx|документ(?:а|ы)?|таблиц\p{L}*|презентац\p{L}*)(?![\p{L}])/giu, "")
      .replace(/[ \t]+/g, " ")
      .trim())
    .filter(Boolean)
    .join("\n");
  return stripped || phrase.trim() || "Пусто";
}

function contentTypes(overrides: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${overrides.join("\n")}
</Types>`;
}

function rootRels(target: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"/>
</Relationships>`;
}

function docx(title: string, text: string): Uint8Array {
  const body = paragraphs(text).map((row) => `<w:p><w:r><w:t xml:space="preserve">${xml(row)}</w:t></w:r></w:p>`).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`;
  return zipStore([
    { path: "[Content_Types].xml", data: utf8(contentTypes(['<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'])) },
    { path: "_rels/.rels", data: utf8(rootRels("word/document.xml")) },
    { path: "word/document.xml", data: utf8(document) },
    { path: "docProps/core.xml", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title></cp:coreProperties>`) },
  ]);
}

function column(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function xlsx(rows: string[][]): Uint8Array {
  const strings: string[] = [];
  const id = (value: string) => {
    const found = strings.indexOf(value);
    if (found >= 0) return found;
    strings.push(value);
    return strings.length - 1;
  };
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, cellIndex) => `<c r="${column(cellIndex)}${rowIndex + 1}" t="s"><v>${id(cell)}</v></c>`).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const shared = strings.map((value) => `<si><t>${xml(value)}</t></si>`).join("");
  return zipStore([
    { path: "[Content_Types].xml", data: utf8(contentTypes([
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>',
    ])) },
    { path: "_rels/.rels", data: utf8(rootRels("xl/workbook.xml")) },
    { path: "xl/workbook.xml", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Лист" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { path: "xl/_rels/workbook.xml.rels", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`) },
    { path: "xl/worksheets/sheet1.xml", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`) },
    { path: "xl/sharedStrings.xml", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${shared}</sst>`) },
  ]);
}

function pptx(title: string, text: string): Uint8Array {
  const slides = paragraphs(text).slice(0, 8);
  const files: Array<{ path: string; data: Uint8Array }> = [];
  const overrides = slides.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
  overrides.unshift('<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>');
  const slideIds = slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`).join("");
  const slideRels = slides.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  files.push(
    { path: "[Content_Types].xml", data: utf8(contentTypes(overrides)) },
    { path: "_rels/.rels", data: utf8(rootRels("ppt/presentation.xml")) },
    { path: "ppt/presentation.xml", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>`) },
    { path: "ppt/_rels/presentation.xml.rels", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideRels}</Relationships>`) },
  );
  slides.forEach((slide, index) => {
    const heading = index === 0 ? title : `Слайд ${index + 1}`;
    files.push({
      path: `ppt/slides/slide${index + 1}.xml`,
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="365760"/><a:ext cx="8229600" cy="4389120"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="ru-RU" sz="3200"/><a:t>${xml(heading)}</a:t></a:r></a:p><a:p><a:r><a:rPr lang="ru-RU" sz="2000"/><a:t>${xml(slide)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`),
    });
  });
  return zipStore(files);
}

export function buildOffice(phrase: string): OfficeFile {
  const kind = officeKind(phrase);
  const text = bodyOf(phrase);
  const title = text.split(/[.\n]/)[0]?.trim().slice(0, 60) || "Документ";
  const bytes = kind === "pdf" ? pdfBytes(`${title}\n${text}`) : kind === "xlsx" ? xlsx(table(text)) : kind === "pptx" ? pptx(title, text) : docx(title, text);
  return { kind, name: fileName(title, kind), mime: MIME[kind], bytes };
}
