import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not set in .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function runPrompt(systemPrompt: string, userPrompt: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro-latest",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userPrompt);
  const response = await result.response;
  const text = response.text();
  return text;
}
