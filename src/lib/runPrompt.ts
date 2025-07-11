import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { runPromptStream } from "@/integrations/openrouter/openRouterClient";
import { parseAndStoreFieldSet } from "@/lib/fieldParsing";
import { flushSync } from "react-dom";
import { LanguageModelUsage } from "ai";

type Run = Tables<"run">;

export interface RunResult {
  run: Run;
  usage: LanguageModelUsage | null;
  finishReason: string | null;
  promptParams: unknown;
}

/**
 * Runs a prompt, streams the output, and creates a new run in the database.
 *
 * @param promptId - The ID of the prompt to run (nullable)
 * @param bookInputId - The ID of the book input
 * @param openRouterApiKey - The OpenRouter API key
 * @param promptSettings - Object containing promptText and temperature
 * @param selectedModel - The model to use for the prompt
 * @param ocrMarkdown - The OCR markdown content
 * @param abortSignal - Signal to abort the operation
 * @param onStream - Optional callback for streaming output chunks
 * @returns The newly created run object along with usage and finish reason data.
 * @throws An error if the run fails.
 */
export async function runPrompt(
  promptId: number | null,
  bookInputId: number,
  openRouterApiKey: string,
  promptSettings: {
    promptText: string;
    temperature: number;
  },
  selectedModel: string,
  ocrMarkdown: string,
  abortSignal: AbortSignal,
  onStream?: (chunk: string) => void
): Promise<RunResult> {
  // Get the stream with abort signal
  const { textStream, finishReasonPromise, usagePromise, promptParams } =
    await runPromptStream(
      promptSettings.promptText,
      ocrMarkdown,
      selectedModel,
      openRouterApiKey,
      promptSettings.temperature,
      abortSignal
    );

  // Process stream with abort support
  const reader = textStream.getReader();
  let result = "";
  let fullResult = "";

  while (true) {
    if (abortSignal.aborted) {
      reader.releaseLock();
      throw new DOMException("Stream aborted", "AbortError");
    }

    const { done, value } = await reader.read();

    if (done) {
      reader.releaseLock();
      break;
    }

    result += value;
    fullResult = result;

    // Only call onStream if it's provided (for streaming mode)
    if (onStream) {
      // Use flushSync to force immediate DOM update in the calling component
      flushSync(() => {
        onStream(result);
      });
    }
  }

  // After streaming completes, check the finish reason and get usage
  const finishReason = await finishReasonPromise;
  const usage = await usagePromise;

  if (finishReason && finishReason !== "stop") {
    if (finishReason === "length") {
      throw new Error(
        "Ran out of tokens before finishing (max tokens reached)"
      );
    }
    throw new Error(`Streaming finished with reason: ${finishReason}`);
  }

  // If the process was aborted, we'll have thrown an error already.
  // Now, parse fields and save the final run to the database.
  let discoveredFieldsId = null;
  try {
    discoveredFieldsId = await parseAndStoreFieldSet(fullResult);
  } catch (error) {
    console.error("Error parsing and storing field set:", error);
    // Continue with run creation even if field parsing fails
  }

  // Create new run with the complete result
  const { data: newRun, error: runError } = await supabase
    .from("run")
    .insert({
      prompt_id: promptId,
      book_input_id: bookInputId,
      output: fullResult,
      temperature: promptSettings.temperature,
      model: selectedModel,
      discovered_fields: discoveredFieldsId,
    })
    .select()
    .single();

  if (runError) throw runError;

  return {
    run: newRun,
    usage,
    finishReason,
    promptParams,
  };
}
