import OpenAI from "openai";
import {
  generateText,
  streamText,
  CoreUserMessage,
  CoreSystemMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { max } from "date-fns";

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
function getMessages(
  llmPrompt: string,
  markdown: string
): Array<CoreUserMessage | CoreSystemMessage> {
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

  return messages;
}
function getMaxTokens(markdown: string): number {

  // Let's set the maxTokens to at least the length of the markdown content
  // because we're typically working on minority languages so can expect poor tokenization.
  const tokensForInputMarkdown = markdown.length;
  const kMultiplierForAnnotations = 3; // todo: at the moment 1,411 input tokens are leading to 3,848 output tokens
  const kMysteryOverhead = 2000;
  const maxTokens =
    tokensForInputMarkdown +
    markdown.length * kMultiplierForAnnotations +
    kMysteryOverhead;
  return Math.round(maxTokens);
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

  // Call the AI model to enrich the markdown
  const generateOptions = {
    model: openrouterProvider(modelId),
    getMessages: getMessages(llmPrompt, markdown),
    temperature,
    maxTokens: getMaxTokens(markdown),
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

  // Call the AI model to stream the response
  const result = await streamText({
    model: openrouterProvider(modelId),
    messages: getMessages(llmPrompt, markdown),
    temperature,
    maxTokens: getMaxTokens(markdown),
    abortSignal,
  });

  return {
    textStream: result.textStream,
    promptParams: {
      inputLength: markdown.length,
      promptLength: llmPrompt.length,
      maxTokens: getMaxTokens(markdown),
    },
    finishReasonPromise: result.finishReason,
    usagePromise: result.usage,
  };
}
