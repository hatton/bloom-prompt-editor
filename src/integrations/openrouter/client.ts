import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENROUTER_KEY;

const openrouter = apiKey
  ? new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // This is required for browser usage.
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:5173", // Optional, for development.
        "X-Title": "Bloom Prompt Editor", // Optional.
      },
    })
  : null;

export async function runPrompt(systemPrompt: string, userPrompt: string) {
  if (!openrouter) {
    return "The `VITE_OPENROUTER_KEY` environment variable is missing. Please add it to your environment variables restart the development server. You can get a key from [OpenRouter](https://openrouter.ai/).";
  }
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
