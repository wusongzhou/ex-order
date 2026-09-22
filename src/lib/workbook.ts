import AdmZip from "adm-zip";
import * as XLSX from "xlsx";

export type ParsedItem = {
  name: string; // 品种名
  size: string; // 花径（常规/迷你/大花）
  flowerType: string; // 花型
  color: string; // 颜色
  grade: string; // 等级
  price: number; // 价格
  rawStock: number; // 原始库存（Excel 模板列，即本期库存）
  stock: number; // 库存（上传时自动 = 原始库存）
  image1?: Buffer; // 品种图片1（Excel 嵌入图片）
  image2?: Buffer; // 品种图片2
};

/** 表头文字 → 字段（按模板表头定位列，列顺序变化也能正确解析）。
 *  注意：模板中不需要「剩余数量」列，系统自动按原始库存生成。 */
const FIELD_BY_HEADER: Record<string, string> = {
  品种名: "name",
  花径: "size",
  花型: "flowerType",
  颜色: "color",
  等级: "grade",
  价格: "price",
  原始库存: "rawStock",
};

/**
 * 提取 xlsx 中嵌入的浮动图片（xl/media + drawing 锚点）。
 * 返回 Map：key = "列:行"（0 基）→ 图片字节。
 */
function extractImages(data: Buffer): Map<string, Buffer> {
  const map = new Map<string, Buffer>();
  let zip: AdmZip;
  try {
    zip = new AdmZip(data);
  } catch {
    return map;
  }
  const drawingEntry = zip
    .getEntries()
    .find((e) => /^xl\/drawings\/drawing\d+\.xml$/.test(e.entryName));
  if (!drawingEntry) return map;
  const xml = drawingEntry.getData().toString("utf-8");

  // rels: rId → media 文件路径（Target 相对 xl/drawings/，如 ../media/image1.png）
  const ridToMedia = new Map<string, string>();
  const relsEntry = zip.getEntry(`xl/drawings/_rels/${drawingEntry.name}.rels`);
  if (relsEntry) {
    const relsXml = relsEntry.getData().toString("utf-8");
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*\/>/g)) {
      const id = m[0].match(/Id="([^"]+)"/);
      const target = m[0].match(/Target="([^"]+)"/);
      if (id && target && target[1].includes("media")) {
        ridToMedia.set(id[1], "xl" + target[1].replace("../", "/"));
      }
    }
  }

  // 每个 anchor 的起始单元格 + 引用的图片
  for (const a of xml.matchAll(
    /<xdr:(?:one|two)CellAnchor[\s\S]*?<\/xdr:(?:one|two)CellAnchor>/g
  )) {
    const block = a[0];
    const from = block.match(/<xdr:from>[\s\S]*?<\/xdr:from>/);
    const rid = block.match(/r:embed="([^"]+)"/);
    if (!from || !rid) continue;
    const col = from[0].match(/<xdr:col>(\d+)<\/xdr:col>/);
    const row = from[0].match(/<xdr:row>(\d+)<\/xdr:row>/);
    if (!col || !row) continue;
    const media = ridToMedia.get(rid[1]);
    if (!media) continue;
    const entry = zip.getEntry(media);
    if (!entry) continue;
    map.set(`${col[1]}:${row[1]}`, entry.getData());
  }
  return map;
}

/**
 * 解析商家每日商品工作簿，保留模板中的全部商品属性与嵌入图片。
 * 结构约定：第一个 sheet，前 10 行内有一行第一列为「品种名」的表头，
 * 按表头文字定位各列（品种名/花径/花型/颜色/等级/价格/原始库存）。
 * 剩余数量不上传，系统自动生成 = 原始库存（新的一天从头开始卖）。
 */
export function parseWorkbook(data: Buffer) {
  const wb = XLSX.read(data, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("工作簿中没有工作表");
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });

  let headerRow = -1;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    if (String(aoa[i]?.[0] ?? "").trim() === "品种名") {
      headerRow = i;
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error(
      "上传的表格不是模板格式：未找到「品种名」表头。请使用页面「下载模板」中的表格结构"
    );
  }

  // 按表头文字定位各字段所在列
  const col: Record<string, number> = {};
  const header = aoa[headerRow] ?? [];
  for (let j = 0; j < header.length; j++) {
    const field = FIELD_BY_HEADER[String(header[j] ?? "").trim()];
    if (field && !(field in col)) col[field] = j;
  }

  // 必填列校验：品种名（已定位）+ 价格 + 原始库存，缺一不可
  const missingNames: string[] = [];
  if (!("price" in col)) missingNames.push("价格");
  if (!("rawStock" in col)) missingNames.push("原始库存");
  if (missingNames.length > 0) {
    throw new Error(
      `上传的表格不是模板格式：表头缺少「${missingNames.join("、")}」列。` +
        "请使用页面「下载模板」中的表格结构（品种名 / 花径 / 花型 / 颜色 / 等级 / 价格 / 原始库存）"
    );
  }

  const cell = (row: unknown[], field: string) => (field in col ? row[col[field]] : "");
  const text = (v: unknown) => String(v ?? "").trim();

  // 品种图片1/2 所在列 + 提取嵌入图片
  let img1Col = -1;
  let img2Col = -1;
  for (let j = 0; j < header.length; j++) {
    const h = String(header[j] ?? "").trim();
    if (h === "品种图片1") img1Col = j;
    if (h === "品种图片2") img2Col = j;
  }
  const images = img1Col >= 0 || img2Col >= 0 ? extractImages(data) : new Map<string, Buffer>();

  const items: ParsedItem[] = [];
  for (let i = headerRow + 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    const name = text(cell(row, "name"));
    if (!name) continue;
    const priceRaw = cell(row, "price");
    const price = Number(priceRaw);
    if (priceRaw === "" || priceRaw === null || priceRaw === undefined || isNaN(price)) continue;

    const rawStockNum = Number(cell(row, "rawStock"));
    const hasRawStock =
      "rawStock" in col &&
      rawStockNum !== null &&
      rawStockNum !== undefined &&
      cell(row, "rawStock") !== "" &&
      !isNaN(rawStockNum);
    const rawStock = hasRawStock && rawStockNum >= 0 ? rawStockNum : 0;
    // 剩余数量自动生成 = 原始库存；模板无原始库存列时视为不限量
    const stock = hasRawStock ? rawStock : 9999;

    const item: ParsedItem = {
      name,
      size: text(cell(row, "size")),
      flowerType: text(cell(row, "flowerType")),
      color: text(cell(row, "color")),
      grade: text(cell(row, "grade")),
      price,
      rawStock,
      stock,
      image1: img1Col >= 0 ? images.get(`${img1Col}:${i}`) : undefined,
      image2: img2Col >= 0 ? images.get(`${img2Col}:${i}`) : undefined,
    };

    const key = `${item.name}|${item.size}|${item.flowerType}|${item.color}|${item.grade}`;
    if (
      items.some((it) => `${it.name}|${it.size}|${it.flowerType}|${it.color}|${it.grade}` === key)
    )
      continue;
    items.push(item);
  }

  if (items.length === 0) {
    throw new Error("没有解析到任何商品（检查「品种名」和「价格」列是否有值）");
  }

  // 表头上方的簿记行：识别供货日期（如"9月22"）与商家名（如"嵩明集货站"）
  let dateGuess: string | null = null;
  let titleGuess: string | null = null;
  for (let i = 0; i < headerRow && i < aoa.length; i++) {
    for (let j = 0; j < 16; j++) {
      const v = aoa[i]?.[j];
      if (v === "" || v === null || v === undefined) continue;
      const s = String(v).trim();
      const m = s.match(/^(\d{1,2})月(\d{1,2})日?$/);
      if (m) {
        if (!dateGuess) {
          const y = new Date().getFullYear();
          const guess = new Date(y, Number(m[1]) - 1, Number(m[2]));
          const year = guess.getTime() < Date.now() - 180 * 24 * 3600 * 1000 ? y + 1 : y;
          dateGuess = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        }
        continue;
      }
      if (!titleGuess && isNaN(Number(s)) && s.length >= 2 && s.length <= 20) {
        titleGuess = s;
      }
    }
  }

  return { items, dateGuess, titleGuess, sheetName: wb.SheetNames[0], headerRow: headerRow + 1 };
}
