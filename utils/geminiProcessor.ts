import { GoogleGenAI } from "@google/genai";
import { DiagramBox } from "../types";
import { blobToBase64 } from "./imageUtils";

export class GeminiProcessor {
  private client: GoogleGenAI;
  private modelName: string;

  constructor(modelName: string, apiKey?: string) {
    const key = apiKey || process.env.API_KEY;
    this.client = new GoogleGenAI({ apiKey: key || '' });
    this.modelName = modelName;
  }

  async getDiagrams(imageBlob: Blob, prompt: string): Promise<DiagramBox[]> {
    try {
      const base64 = await blobToBase64(imageBlob);
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: imageBlob.type,
                data: base64
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) return [];

      let cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanJson);
      
      let items = Array.isArray(data) ? data : [data];
      // Normalize to array of boxes
      return items.filter((i: any) => i.diagram_present && i.box_2d);

    } catch (e) {
      console.error("Gemini Diagram Error:", e);
      return [];
    }
  }

  async transcribe(imageBlob: Blob, prompt: string, styleGuide: string): Promise<string> {
    try {
      const fullPrompt = prompt.replace("{{STYLE_GUIDE}}", styleGuide);
      const base64 = await blobToBase64(imageBlob);
      
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: {
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType: imageBlob.type,
                data: base64
              }
            }
          ]
        }
      });

      return response.text || "> [!ERROR] Transcription Failed - Empty Response";

    } catch (e) {
      console.error("Gemini Transcription Error:", e);
      return `> [!ERROR] Transcription Failed: ${e instanceof Error ? e.message : 'Unknown Error'}`;
    }
  }

  async generateExcalidraw(imageBlob: Blob, prompt: string): Promise<{ data: string, confidence: number } | null> {
    try {
      const base64 = await blobToBase64(imageBlob);
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: imageBlob.type,
                data: base64
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) return null;

      let cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        return null;
      }

      // Wrap in standard Excalidraw envelope
      const excalidrawFile = {
        type: "excalidraw",
        version: 2,
        source: "https://excalidraw.com",
        elements: parsed.elements,
        appState: {
          viewBackgroundColor: "#ffffff",
          currentItemFontFamily: 1
        }
      };

      return {
        data: JSON.stringify(excalidrawFile, null, 2),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      };

    } catch (e) {
      console.error("Excalidraw Generation Error:", e);
      return null;
    }
  }
}