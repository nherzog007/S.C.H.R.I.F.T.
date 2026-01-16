
# Trilium Formatting Master Reference

## 1. Decision Logic: Text vs. Math (CRITICAL)
* **IS IT MATH?** If the text contains: `=`, `→`, `∈`, `∀`, `∃`, numbers, variables ($x, y$), or functions ($f(x)$).
  * **Rule:** You MUST use LaTeX wrapped in dollar signs.
  * **Highlighting:** Use `$\colorbox{#HEX}{\( content \)}$` (background) or `\textcolor{#HEX}{content}` (text).
* **IS IT TEXT?** If the text is purely words, sentences, or definitions.
  * **Rule:** You MUST use HTML.
  * **Highlighting:** Use `<span style="background-color:#HEX">content</span>` or `<span style="color:#HEX">content</span>`.

## 2. Color Palette (Strict Hex Codes)
You MUST match the handwriting color to the closest code in this table.

| Color | Hex Code | Visual |
| :--- | :--- | :--- |
| **Black/Dark Grey** | `#4d4d4d` | <span style="color:#4d4d4d">█████</span> |
| **Red** | `#e64c4c` | <span style="color:#e64c4c">█████</span> |
| **Orange** | `#e6994c` | <span style="color:#e6994c">█████</span> |
| **Yellow** | `#e6e64c` | <span style="background-color:#e6e64c">█████</span> |
| **Lime** | `#99e64c` | <span style="background-color:#99e64c">█████</span> |
| **Green** | `#4ce64c` | <span style="color:#4ce64c">█████</span> |
| **Mint** | `#4ce699` | <span style="background-color:#4ce699">█████</span> |
| **Cyan** | `#4ce6e6` | <span style="background-color:#4ce6e6">█████</span> |
| **Sky Blue** | `#4c99e6` | <span style="color:#4c99e6">█████</span> |
| **Deep Blue** | `#4c4ce6` | <span style="color:#4c4ce6">█████</span> |
| **Purple** | `#994ce6` | <span style="color:#994ce6">█████</span> |

## 3. Formatting Examples
* **Correct Math Highlight:** $\colorbox{#4ce6e6}{\( x^2 = 4 \)}$
* **Correct Text Highlight:** <span style="background-color:#e6e64c">This is important</span>
* **Correct Colored Variable:** $\textcolor{#e64c4c}{\alpha}$
* **Complex Example (Mixed):**
  $x = \frac{-\textcolor{#4c99e6}{b} \pm \sqrt{\textcolor{#4c99e6}{b}^2 - 4\colorbox{#e6e64c}{\( a \)}c}}{2\colorbox{#e6e64c}{\( a \)}}$

## 4. Callout Boxes (Alerts)

> [!NOTE]
> **Note:** Useful information.

> [!TIP]
> **Tip:** Shortcuts and hints.

> [!IMPORTANT]
> **Important:** Crucial information.

> [!WARNING]
> **Warning:** Critical info.

> [!CAUTION]
> **Caution:** Negative outcomes.
