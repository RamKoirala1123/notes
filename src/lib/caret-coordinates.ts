// Caret coordinate calculation for HTMLTextAreaElement
// Mirrors textarea properties into a temporary offscreen element to calculate pixel coordinates of any caret index.

const properties = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
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
] as const;

export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

export function getCaretCoordinates(element: HTMLTextAreaElement, position: number): CaretCoordinates {
  if (typeof window === "undefined" || !element) {
    return { top: 0, left: 0, height: 20 };
  }

  // Create or reuse mirror div
  let div = document.getElementById("textarea-caret-position-mirror") as HTMLDivElement | null;
  if (!div) {
    div = document.createElement("div");
    div.id = "textarea-caret-position-mirror";
    document.body.appendChild(div);
  }

  const style = div.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.position = "absolute";
  style.visibility = "hidden";
  style.top = "0px";
  style.left = "-9999px";
  style.overflow = "hidden";

  // Transfer textarea CSS properties to mirror div
  properties.forEach((prop) => {
    // @ts-expect-error property index
    style[prop] = computed[prop];
  });

  style.width = `${element.clientWidth}px`;

  div.textContent = element.value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);

  const elementRect = element.getBoundingClientRect();
  const lineHeight = parseInt(computed.lineHeight) || 20;

  const top = elementRect.top + span.offsetTop - element.scrollTop;
  const left = elementRect.left + span.offsetLeft - element.scrollLeft;

  return {
    top,
    left,
    height: lineHeight,
  };
}
