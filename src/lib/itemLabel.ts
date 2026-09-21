/** 商品短标签：品种名+等级+颜色（如「春闺B深粉」），用于紧凑展示 */
export function itemShortLabel(it: { name: string; grade?: string; color?: string }): string {
  return [it.name, it.grade, it.color].filter(Boolean).join("");
}

/** 商品属性行：花径 · 花型 · 颜色 · 等级 */
export function itemAttrLine(it: {
  size?: string;
  flowerType?: string;
  color?: string;
  grade?: string;
}): string {
  return [it.size, it.flowerType, it.color, it.grade].filter(Boolean).join(" · ");
}
