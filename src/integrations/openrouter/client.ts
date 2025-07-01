import OpenAI from "openai";
import { generateText, CoreUserMessage, CoreSystemMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
const apiKey = import.meta.env.VITE_OPENROUTER_KEY;

export async function runPrompt(llmPrompt: string, markdown: string) {
  const openrouterProvider = createOpenRouter({
    apiKey: apiKey,
  });

  // let's set the maxTokens to at least the length of the markdown content
  // because we're typically working on minority languages so can expect poor tokenization.
  const maxTokens = markdown.length + 2000; // Adding a buffer of 2000 tokens for metadata and new tagging
  const messages: Array<CoreUserMessage | CoreSystemMessage> = [
    {
      role: "system",
      content: llmPrompt,
    },
  ];

  messages.push({
    role: "user",
    content: `Here is the Markdown content:\n\n${markdown}`,
  });
  // Call the AI model to enrich the markdown
  const result = await generateText({
    model: openrouterProvider("google/gemini-flash-1.5"),
    messages,
    temperature: 0.0, // Deterministic, no creativity needed
    maxTokens,
    toolChoice: "none" /* no thinking. "auto" might allow thinking */,
  });
  return result.text;
}
