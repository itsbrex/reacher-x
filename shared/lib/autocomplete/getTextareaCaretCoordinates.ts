const CARET_MIRROR_STYLE_PROPS = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "MozTabSize",
  "direction",
] as const;

export type TextareaCaretCoordinates = {
  top: number;
  left: number;
  lineHeight: number;
};

export function getTextareaCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number
): TextareaCaretCoordinates {
  const ownerDocument = textarea.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const computed = ownerWindow?.getComputedStyle?.(textarea) ?? null;
  const fallbackLineHeight = computed
    ? Number.parseFloat(computed.lineHeight) ||
      Number.parseFloat(computed.fontSize) ||
      20
    : 20;

  if (
    !computed ||
    typeof ownerDocument.createElement !== "function" ||
    !ownerDocument.body
  ) {
    return { top: 0, left: 0, lineHeight: fallbackLineHeight };
  }

  const mirror = ownerDocument.createElement("div");

  try {
    mirror.setAttribute("aria-hidden", "true");
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.overflow = "hidden";

    for (const property of CARET_MIRROR_STYLE_PROPS) {
      const value = (computed as any)[property] as string | undefined;
      if (typeof value === "string" && value.length > 0) {
        (mirror.style as any)[property] = value;
      }
    }

    mirror.textContent = textarea.value.slice(0, position);

    const marker = ownerDocument.createElement("span");
    marker.textContent = textarea.value.slice(position) || ".";
    mirror.appendChild(marker);
    ownerDocument.body.appendChild(mirror);

    const top = marker.offsetTop - textarea.scrollTop;
    const left = marker.offsetLeft - textarea.scrollLeft;

    return { top, left, lineHeight: fallbackLineHeight };
  } catch {
    return { top: 0, left: 0, lineHeight: fallbackLineHeight };
  } finally {
    if (mirror.parentNode === ownerDocument.body) {
      ownerDocument.body.removeChild(mirror);
    }
  }
}
