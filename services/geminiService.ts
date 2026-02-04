
import { GoogleGenAI } from "@google/genai";
import { AppData } from "../types";

// Fix: Initializing GoogleGenAI with named parameter apiKey and process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeStockAndOrders = async (data: AppData) => {
  try {
    const prompt = `Analiza los siguientes datos industriales y proporciona 3 recomendaciones clave en formato breve:
    Materiales: ${JSON.stringify(data.MATERIALES)}
    Órdenes de Fabricación: ${JSON.stringify(data.ORD_FABRICACIONES)}
    Responde en español y enfócate en optimización de stock y cuellos de botella.`;

    // Fix: Using ai.models.generateContent to query with model name and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Fix: Accessing .text property directly from response object (not a method)
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "No se pudo generar el análisis en este momento.";
  }
};