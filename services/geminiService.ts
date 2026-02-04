
import { GoogleGenAI } from "@google/genai";
import { AppData } from "../types";

// Acceso seguro a la API KEY para evitar ReferenceError
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeStockAndOrders = async (data: AppData) => {
  if (!ai) {
    return "La Inteligencia Artificial no está configurada (Falta API KEY).";
  }

  try {
    const prompt = `Analiza los siguientes datos industriales y proporciona 3 recomendaciones clave en formato breve:
    Materiales: ${JSON.stringify(data.MATERIALES.slice(0, 5))}
    Órdenes de Fabricación: ${JSON.stringify(data.ORD_FABRICACIONES.slice(0, 5))}
    Responde en español y enfócate en optimización de stock y cuellos de botella.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se generó respuesta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con el servicio de IA.";
  }
};
