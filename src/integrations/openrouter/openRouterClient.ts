import OpenAI from "openai";
import {
  generateText,
  streamText,
  CoreUserMessage,
  CoreSystemMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

interface OpenRouterModel {
  id: string;
  name: string;
}

let cachedModels: OpenRouterModel[] = [];

export async function getModels(): Promise<OpenRouterModel[]> {
  if (cachedModels.length > 0) {
    return cachedModels;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    const data = await response.json();
    cachedModels = data.data; // The models are in the 'data' property
    cachedModels.sort((a, b) => a.name.localeCompare(b.name));
    return cachedModels;
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return [];
  }
}

export async function runPrompt(
  llmPrompt: string,
  markdown: string,
  modelId: string,
  apiKey: string,
  temperature: number = 0.0
) {
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
  const generateOptions = {
    model: openrouterProvider(modelId),
    messages,
    temperature,
    maxTokens,
  };

  const result = await generateText(generateOptions);
  return result.text;
}

export async function runPromptStream(
  llmPrompt: string,
  markdown: string,
  modelId: string,
  apiKey: string,
  temperature: number = 0.0,
  abortSignal?: AbortSignal
) {
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

  // Call the AI model to stream the response
  const result = await streamText({
    model: openrouterProvider(modelId),
    messages,
    temperature,
    maxTokens,
    abortSignal,
  });

  return result.textStream;
}
