// src/lib/relation-config.ts

export const RELATION_CONFIG = {
  extend:     { label: "延伸", color: "#22c55e", emoji: "🟢" },
  supplement: { label: "补充", color: "#3b82f6", emoji: "🔵" },
  conflict:   { label: "矛盾", color: "#ef4444", emoji: "🔴" },
  example:    { label: "举例", color: "#eab308", emoji: "🟡" },
}

export const CONFIDENCE_CONFIG = {
  direct:   { label: "",       dimmed: false },
  inferred: { label: "AI推断", dimmed: false },
  uncertain:{ label: "待确认", dimmed: true  },
}

export const CATEGORY_COLORS = [
  "#2180A0", "#196570", "#4ca5b0",
  "#bf912d", "#c52040", "#3d919d",
]
