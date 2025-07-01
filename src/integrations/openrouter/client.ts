import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: import.meta.env.VITE_OPENROUTER_KEY,
  dangerouslyAllowBrowser: true, // This is required for browser usage.
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173", // Optional, for development.
    "X-Title": "Bloom Prompt Editor", // Optional.
  },
});

export async function runPrompt(systemPrompt: string, userPrompt: string) {
  const completion = await openrouter.chat.completions.create({
    model: "google/gemini-pro-1.5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const content = completion.choices[0].message.content;
  if (content === null) {
    return "";
  }
  return content;
}
