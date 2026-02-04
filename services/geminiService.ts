import { GoogleGenAI } from "@google/genai";
import { AppData } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); as per library guidelines.
// Assume process.env.API_KEY is pre-configured and valid in this context.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeStockAndOrders = async (data: AppData) => {
  try {
    const prompt = `Analiza los siguientes datos industriales y proporciona 3 recomendaciones clave en formato breve:
    Materiales: ${JSON.stringify(data.MATERIALES.slice(0, 5))}
    Órdenes de Fabricación: ${JSON.stringify(data.ORD_FABRICACIONES.slice(0, 5))}
    Responde en español y enfócate en optimización de stock y cuellos de botella.`;

    // Always use ai.models.generateContent with the model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // The .text property returns the extracted string output directly.
    return response.text || "No se generó respuesta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con el servicio de IA.";
  }
};
