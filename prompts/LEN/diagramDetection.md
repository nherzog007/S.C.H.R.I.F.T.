
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
      "box_2d": [ymin, xmin, ymax, xmax],
      "label": "DescriptiveName",
      "id": "DIAGRAM_1",
      "visual_summary": "Short 10-15 word description for duplicate detection",
      "output_type": "excalidraw"
    }
  ]
}

## ⚠️ Classification Rules for "output_type"

**Type: "excalidraw" (Convertible Vector Graphics)**
Use this for schematic, clear, line-based drawings:
*   Standard Graphs (Line, Bar, Scatter) & Coordinate Systems
*   Circuit Diagrams & Schematics
*   Phasor Diagrams (Zeigerdiagramme)
*   Geometric Constructions (Triangles, Circles)
*   Flowcharts & Block Diagrams

**Type: "image" (Keep as PNG)**
Use this for complex, realistic, or software-based visuals:
*   Software Screenshots (MATLAB, LabView, UI interfaces)
*   Realistic Physics Illustrations (e.g., textured springs, masses with 3D shading)
*   Heatmaps / Color Gradients / Spectrograms
*   Photographs or highly detailed 3D renders
*   Handwriting that is too chaotic/messy to vetorize accurately

## ⚠️ IGNORED ELEMENTS (Strict)

Do NOT detect or create bounding boxes for:
1. **Institute Logos:** Any logo in the corners (e.g., University seal, Department icon).
2. **Navigation Elements:** Slide numbers (e.g., "14/32"), footers, progress bars.
3. **Static Template Graphics:** Recursive background lines, watermarks, or decorative borders that appear on every slide.

Only detect CONTENT that is unique to this lecture slide.
