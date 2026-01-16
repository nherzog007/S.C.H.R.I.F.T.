
**Task:** Detect visual elements and provide a bounding box for each.

**CRITICAL RULE: The "Arrow & Glue" Rule**
* **Arrows = Glue:** If a text label (e.g., "Einheitskreis mit Zentrum O") points to the drawing with an ARROW or line, that text **IS PART OF THE DIAGRAM**.
* **Expand the Box:** You must expand the bounding box to include:
  1. The Diagram itself.
  2. The Arrow/Line connecting them.
  3. The Text Label at the start of the arrow.

**Strict Constraints:**
1. **KEEP (True):** Annotated Diagrams, Composite Diagrams, Labeled Drawings.
2. **IGNORE (False):** Paragraphs, Math Grouping (curly braces) unless part of a plot.

**Output:** Return ONLY a JSON object with a "diagrams" array.
**Format:** Scale 0 to 1000.

**JSON Structure:** 
{
  "diagrams": [
    { 
      "box_2d": [ymin, xmin, ymax, xmax] 
    },
    ...
  ]
}
