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
  console.log("🚀 runPrompt: Starting prompt execution", {
    promptId,
    bookInputId,
    selectedModel,
    temperature: promptSettings.temperature,
    hasOnStream: !!onStream,
    promptTextLength: promptSettings.promptText.length,
    ocrMarkdownLength: ocrMarkdown.length,
  });

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

  console.log("📡 runPrompt: Got stream from runPromptStream", {
    promptParams,
  });

  // Process stream with abort support
  const reader = textStream.getReader();
  let result = "";
  let fullResult = "";
  let chunkCount = 0;

  console.log("🔄 runPrompt: Starting to read stream...");

  while (true) {
    if (abortSignal.aborted) {
      console.log("❌ runPrompt: Stream aborted by abort signal");
      reader.releaseLock();
      throw new DOMException("Stream aborted", "AbortError");
    }

    const { done, value } = await reader.read();

    if (done) {
      console.log("✅ runPrompt: Stream reading completed", {
        totalChunks: chunkCount,
        finalResultLength: result.length,
      });
      reader.releaseLock();
      break;
    }

    chunkCount++;
    result += value;
    fullResult = result;

    console.log(`📄 runPrompt: Received chunk ${chunkCount}`, {
      chunkLength: value.length,
      totalLength: result.length,
      chunk: value.substring(0, 100) + (value.length > 100 ? "..." : ""),
    });

    // Only call onStream if it's provided (for streaming mode)
    if (onStream) {
      console.log(
        `🎯 runPrompt: Calling onStream callback for chunk ${chunkCount}`
      );
      // Use flushSync to force immediate DOM update in the calling component
      flushSync(() => {
        onStream(result);
      });
      console.log(
        `✨ runPrompt: onStream callback completed for chunk ${chunkCount}`
      );
    } else {
      console.log(
        `⚠️ runPrompt: No onStream callback provided for chunk ${chunkCount}`
      );
    }
  }

  console.log("⏳ runPrompt: Waiting for finish reason and usage...");

  // Check for payment or API errors immediately when stream is empty
  if (chunkCount === 0 && fullResult === "") {
    console.log("💳 runPrompt: Detected payment or API error (empty stream)");

    // Still try to save the run for diagnostic purposes
    const discoveredFieldsId = null;
    let diagnosticRun: Run | null = null;
    
    try {
      const { data: newRun, error: runError } = await supabase
        .from("run")
        .insert({
          prompt_id: promptId,
          book_input_id: bookInputId,
          output: fullResult,
          temperature: promptSettings.temperature,
          model: selectedModel,
          discovered_fields: discoveredFieldsId,
          tokens_used: 0,
          finish_reason: "payment",
        })
        .select()
        .single();

      if (!runError) {
        console.log(
          "💾 runPrompt: Diagnostic run record created for error case",
          { runId: newRun.id }
        );
        diagnosticRun = newRun;
      } else {
        console.error("❌ runPrompt: Error creating diagnostic run record:", runError);
      }
    } catch (dbError) {
      console.error("❌ runPrompt: Failed to save diagnostic run record:", dbError);
    }

    // Create error with run result if we have one
    const error = new Error(
      "API request failed - this may be due to insufficient credits, invalid API key, or service unavailability. Please check your OpenRouter account and API key."
    ) as Error & { runResult?: RunResult };
    
    if (diagnosticRun) {
      const result: RunResult = {
        run: diagnosticRun,
        usage: null,
        finishReason: "payment",
        promptParams,
      };
      error.runResult = result;
      console.log("📋 runPrompt: Attaching run result to error", { runId: diagnosticRun.id });
    }
    
    throw error;
  }

  // After streaming completes, check the finish reason and get usage
  let finishReason: string | null = null;
  let usage: LanguageModelUsage | null = null;

  try {
    finishReason = await finishReasonPromise;
    console.log("📊 runPrompt: Got finish reason", { finishReason });
  } catch (error) {
    console.error("❌ runPrompt: Error getting finish reason:", error);
    finishReason = "error";
  }

  try {
    usage = await usagePromise;
    console.log("📊 runPrompt: Got usage data", {
      totalTokens: usage?.totalTokens,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
    });
  } catch (error) {
    console.error("❌ runPrompt: Error getting usage data:", error);
    usage = null;
  }

  // Check for additional error conditions
  if (finishReason === "error") {
    console.log("❌ runPrompt: Got error finish reason");
    throw new Error(
      "API request failed - this may be due to insufficient credits, invalid API key, or service unavailability. Please check your OpenRouter account and API key."
    );
  }

  console.log("📊 runPrompt: Got completion data", {
    finishReason,
    usage: {
      totalTokens: usage?.totalTokens,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
    },
  });

  // Parse fields and save the run to the database regardless of finish reason
  // This ensures we have diagnostic information even when runs fail
  let discoveredFieldsId = null;
  try {
    console.log("🔍 runPrompt: Parsing and storing field set...");
    discoveredFieldsId = await parseAndStoreFieldSet(fullResult);
    console.log("✅ runPrompt: Field set parsed and stored", {
      discoveredFieldsId,
    });
  } catch (error) {
    console.error("❌ runPrompt: Error parsing and storing field set:", error);
    // Continue with run creation even if field parsing fails
  }

  console.log("💾 runPrompt: Creating run record in database...");

  // Create new run with the complete result (including failed runs)
  const { data: newRun, error: runError } = await supabase
    .from("run")
    .insert({
      prompt_id: promptId,
      book_input_id: bookInputId,
      output: fullResult,
      temperature: promptSettings.temperature,
      model: selectedModel,
      discovered_fields: discoveredFieldsId,
      tokens_used: usage?.totalTokens || 0,
      finish_reason: finishReason,
      //seconds_used: usage?. || 0,
    })
    .select()
    .single();

  if (runError) {
    console.error("❌ runPrompt: Error creating run record:", runError);
    throw runError;
  }

  console.log("✅ runPrompt: Run record created successfully", {
    runId: newRun.id,
    outputLength: fullResult.length,
    tokensUsed: usage?.totalTokens || 0,
  });

  // After saving the run, check the finish reason and throw errors if needed
  // This way we have the diagnostic data saved even for failed runs
  if (finishReason && finishReason !== "stop") {
    console.log("⚠️ runPrompt: Non-stop finish reason detected", {
      finishReason,
    });
    if (finishReason === "length") {
      throw new Error(
        "Ran out of tokens before finishing (max tokens reached)"
      );
    }
    if (finishReason === "error" || finishReason === "payment") {
      throw new Error(
        "API request failed - this may be due to insufficient credits, invalid API key, or service unavailability. Please check your OpenRouter account and API key."
      );
    }
    throw new Error(`Streaming finished with reason: ${finishReason}`);
  }

  console.log("🎉 runPrompt: Prompt execution completed successfully", {
    runId: newRun.id,
    finalResultLength: fullResult.length,
    finishReason,
    totalTokens: usage?.totalTokens,
  });

  return {
    run: newRun,
    usage,
    finishReason,
    promptParams,
  };
}
