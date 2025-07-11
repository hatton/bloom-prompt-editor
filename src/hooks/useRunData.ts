import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"run">;
type BookInput = Tables<"book-input">;

export const useRunData = (runId: number | null) => {
  const [runData, setRunData] = useState<Run | null>(null);
  const [bookInputData, setBookInputData] = useState<BookInput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRunData = async () => {
      if (!runId) {
        setRunData(null);
        setBookInputData(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("run")
          .select("*")
          .eq("id", runId)
          .single();

        if (error) {
          console.error("Error fetching run data:", error);
          setRunData(null);
          setBookInputData(null);
        } else {
          setRunData(data);

          // Fetch book input data if available
          if (data.book_input_id) {
            const { data: bookData, error: bookError } = await supabase
              .from("book-input")
              .select("*")
              .eq("id", data.book_input_id)
              .single();

            if (bookError) {
              console.error("Error fetching book input data:", bookError);
              setBookInputData(null);
            } else {
              setBookInputData(bookData);
            }
          } else {
            setBookInputData(null);
          }
        }
      } catch (error) {
        console.error("Error fetching run data:", error);
        setRunData(null);
        setBookInputData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRunData();
  }, [runId]);

  return { runData, bookInputData, loading };
};
