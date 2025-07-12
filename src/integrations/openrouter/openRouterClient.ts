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

export interface GenerationData {
  id: string;
  total_cost: number;
  created_at: string;
  model: string;
  origin: string;
  usage: number;
  is_byok: boolean;
  upstream_id: string;
  cache_discount: number;
  upstream_inference_cost: number;
  app_id: number | null;
  streamed: boolean;
  cancelled: boolean;
  provider_name: string;
  latency: number;
  moderation_latency: number | null;
  generation_time: number;
  finish_reason: string;
  native_finish_reason: string;
  tokens_prompt: number;
  tokens_completion: number;
  native_tokens_prompt: number;
  native_tokens_completion: number;
  native_tokens_reasoning: number;
  num_media_prompt: number | null;
  num_media_completion: number | null;
  num_search_results: number | null;
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

  const kMultiplierForOutput = 3; // While something like English might be 4:1 letter to token, some other script of an unknown language could be 1 token for each unicode byte?
  // todo: at the moment 1,411 input tokens are leading to 3,848 output tokens, probably from thinking. Really we don't
  // want to limit the thinking because if it doesn't finished, we're hosed.
  const kMultiplierForThinking = 6;
  const kMultiplierForAnnotations = 1;
  const maxTokens =
    markdown.length *
    (kMultiplierForOutput + kMultiplierForAnnotations + kMultiplierForThinking);

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
  console.log("🌐 OpenRouter: Starting stream request", {
    modelId,
    temperature,
    promptLength: llmPrompt.length,
    markdownLength: markdown.length,
    hasAbortSignal: !!abortSignal,
    maxTokens: getMaxTokens(markdown),
  });

  const openrouterProvider = createOpenRouter({
    apiKey: apiKey,
  });

  console.log("🔧 OpenRouter: Created provider, calling streamText...");

  // Call the AI model to stream the response
  const result = await streamText({
    model: openrouterProvider(modelId),
    messages: getMessages(llmPrompt, markdown),
    temperature,
    maxTokens: getMaxTokens(markdown),
    abortSignal,
  });

  console.log("✅ OpenRouter: streamText call completed, returning streams", {
    hasTextStream: !!result.textStream,
    hasFinishReasonPromise: !!result.finishReason,
    hasUsagePromise: !!result.usage,
  });

  return {
    textStream: result.textStream,
    promptParams: {
      promptLength: llmPrompt.length,
      inputLength: markdown.length,
      maxTokens: getMaxTokens(markdown),
    },
    finishReasonPromise: result.finishReason,
    usagePromise: result.usage,
    responsePromise: result.response,
  };
}

export async function getGenerationData(
  generationId: string,
  apiKey: string
): Promise<GenerationData | null> {
  try {
    const url = new URL("https://openrouter.ai/api/v1/generation");
    url.searchParams.append("id", generationId);

    console.log("🔍 OpenRouter: Fetching generation data", {
      url: url.toString(),
      generationId,
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error("❌ OpenRouter: Error fetching generation data", {
        status: response.status,
        statusText: response.statusText,
        generationId,
      });
      return null;
    }

    const result = await response.json();
    console.log("✅ OpenRouter: Raw generation response", result);

    // OpenRouter returns data in a 'data' property
    const data = result.data;
    if (!data) {
      console.error("❌ OpenRouter: No data property in response", result);
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ OpenRouter: Error fetching generation data:", error);
    return null;
  }
}
