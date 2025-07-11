import React, { useState, useEffect, useCallback } from "react";
import {
  DataGridPro,
  GridColDef,
  GridToolbar,
  GridRowsProp,
  GridFilterModel,
  GridSortModel,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
  GridCallbackDetails,
  GridRowId,
} from "@mui/x-data-grid-pro";
import { Box, Typography, CircularProgress } from "@mui/material";
import { formatDistanceToNow, isAfter, subDays } from "date-fns";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { getScore } from "@/lib/scoring";
import { getMostRecentRunFieldSetId } from "@/lib/runUtils";
import { getMetadataFields } from "@/components/FieldSetEditor";

type BookInput = Database["public"]["Tables"]["book-input"]["Row"];
type FieldSet = Database["public"]["Tables"]["field-set"]["Row"];

// Extended interface with computed fields
interface InputBookWithComputedFields extends BookInput {
  wordCount: number;
  score: number | undefined;
  correctFields: FieldSet | null;
  lastTestDate: Date | null;
}

// Helper function to count words in markdown
const countWords = (markdown: string | null): number => {
  if (!markdown) return 0;
  // Remove markdown syntax and count words
  const text = markdown
    .replace(/[#*_`[\]]/g, "") // Remove basic markdown syntax
    .replace(/\n/g, " ") // Replace newlines with spaces
    .trim();
  return text.split(/\s+/).filter((word) => word.length > 0).length;
};

// Helper function to format field values for display
// Field value conventions:
// - null: Unknown/missing data (displayed as "-")
// - "empty": Intentionally left empty (displayed as "(empty)")
// - any other string: Actual field content (displayed as-is)
const formatFieldValue = (value: unknown, fieldName: string): string => {
  if (value === null || value === undefined) return "-";

  if (value === "empty") return "(empty)";

  if (fieldName === "created_at") {
    return new Date(value as string).toLocaleDateString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return String(value);
};

// Helper function to count non-null fields in a field-set
// Field value conventions:
// - null: Unknown/missing data (not counted in field counts)
// - "empty": Intentionally left empty (counted as filled field)
// - any other string: Actual field content (counted as filled field)
const countNonNullFields = (fieldSet: FieldSet | null): number => {
  if (!fieldSet) return 0;

  const metadataFields = getMetadataFields();

  const count = metadataFields.reduce((count, field) => {
    const value = fieldSet[field.name];

    // Count fields that have content or are intentionally empty
    // we wanted null to mean unknown and empty string to mean "should be empty", but
    // something was supplying all the fields with empty strings, so
    // no we exclude null/undefined/emptystring
    if (value !== null && value !== undefined && value !== "") {
      return count + 1;
    }
    return count;
  }, 0);

  return count;
};

interface EvalGridState {
  filterModel: GridFilterModel;
  sortModel: GridSortModel;
  columnVisibilityModel: GridColumnVisibilityModel;
}

interface EvalGridMuiProps {
  onRowSelectionChange?: (selectedBookId: number | null) => void;
  onCheckboxSelectionChange?: (selectedBookIds: number[]) => void;
  refreshTrigger?: number; // Add a trigger to force refresh
}

export const EvalGridMui: React.FC<EvalGridMuiProps> = ({
  onRowSelectionChange,
  onCheckboxSelectionChange,
  refreshTrigger,
}) => {
  const [data, setData] = useState<InputBookWithComputedFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<number[]>([]);
  const { toast } = useToast();

  // Read the current selectedBookId from localStorage to sync with other tabs
  const [selectedBookId] = useLocalStorage<number | null>(
    "selectedBookId",
    null
  );

  // Read the selected prompt and model to determine "last test" criteria
  const [selectedPromptId] = useLocalStorage<number | null>(
    "currentPromptId",
    null
  );
  const [selectedModel] = useLocalStorage<string>(
    "selectedModel",
    "google/gemini-flash-1.5"
  );

  // Store grid state in localStorage
  const [gridState, setGridState] = useLocalStorage<EvalGridState>(
    "evalGridMuiState",
    {
      filterModel: { items: [] },
      sortModel: [],
      columnVisibilityModel: {},
    }
  );

  const [filterModel, setFilterModel] = useState<GridFilterModel>(
    gridState.filterModel
  );
  const [sortModel, setSortModel] = useState<GridSortModel>(
    gridState.sortModel
  );
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(gridState.columnVisibilityModel);

  // Update localStorage whenever state changes
  useEffect(() => {
    setGridState({
      filterModel,
      sortModel,
      columnVisibilityModel,
    });
  }, [filterModel, sortModel, columnVisibilityModel, setGridState]);

  // Load book inputs from Supabase
  const loadBookInputs = useCallback(async () => {
    try {
      const { data: bookData, error } = await supabase
        .from("book-input")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform book inputs to include computed fields
      const transformedData: InputBookWithComputedFields[] = await Promise.all(
        (bookData || []).map(async (book) => {
          // Get correct field-set data if available
          let correctFields = null;
          if (book.correct_fields) {
            const { data: fieldSetData } = await supabase
              .from("field-set")
              .select("*")
              .eq("id", book.correct_fields)
              .single();
            correctFields = fieldSetData;
          }

          // Calculate score
          const score = book.id === 10 ? await getScore(book.id) : undefined;

          // Get last test date for this book with selected prompt and model
          let lastTestDate: Date | null = null;
          if (selectedPromptId && selectedModel) {
            const { data: lastRun } = await supabase
              .from("run")
              .select("created_at")
              .eq("book_input_id", book.id)
              .eq("prompt_id", selectedPromptId)
              .eq("model", selectedModel)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastRun) {
              lastTestDate = new Date(lastRun.created_at);
            }
          }

          return {
            ...book,
            wordCount: countWords(book.ocr_markdown),
            score,
            correctFields,
            lastTestDate,
          };
        })
      );

      setData(transformedData);
    } catch (error) {
      console.error("Error loading book inputs:", error);
      toast({
        title: "Error loading book inputs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedPromptId, selectedModel]);

  useEffect(() => {
    loadBookInputs();
  }, [loadBookInputs, refreshTrigger]); // Add refreshTrigger to dependency array

  // Sync grid selection with the selectedBookId from localStorage
  useEffect(() => {
    if (selectedBookId && data.length > 0) {
      // Check if the selectedBookId exists in the current data
      const bookExists = data.find((book) => book.id === selectedBookId);
      if (bookExists) {
        setSelectedRowId([selectedBookId]);
        // Notify parent component about the selection
        onRowSelectionChange?.(selectedBookId);
      } else {
        // If book doesn't exist, clear selection
        setSelectedRowId([]);
        onRowSelectionChange?.(null);
      }
    } else if (data.length > 0) {
      // Clear selection if no selectedBookId
      setSelectedRowId([]);
      onRowSelectionChange?.(null);
    }
  }, [selectedBookId, data, onRowSelectionChange]);

  // Define columns
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 80,
      type: "number",
    },
    {
      field: "label",
      headerName: "Label",
      width: 200,
      valueGetter: (value) => value || "Untitled",
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 120,
      type: "date",
      valueGetter: (value) => (value ? new Date(value) : null),
    },
    {
      field: "wordCount",
      headerName: "Word Count",
      width: 120,
      type: "number",
      align: "right",
      headerAlign: "right",
    },
    {
      field: "ocr_markdown",
      headerName: "OCR Content",
      width: 300,
      renderCell: (params) => {
        const content = params.value as string | null;
        const preview = content
          ? content.substring(0, 100) + (content.length > 100 ? "..." : "")
          : "-";
        return (
          <Box
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              color: "text.secondary",
            }}
            title={content || ""}
          >
            {preview}
          </Box>
        );
      },
    },
    {
      field: "reference_markdown",
      headerName: "Reference Content",
      width: 300,
      renderCell: (params) => {
        const content = params.value as string | null;
        const preview = content
          ? content.substring(0, 100) + (content.length > 100 ? "..." : "")
          : "-";
        return (
          <Box
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              color: "text.secondary",
            }}
            title={content || ""}
          >
            {preview}
          </Box>
        );
      },
    },
    {
      field: "correct_fields",
      headerName: "Fields Count",
      width: 150,
      type: "number",
      align: "center",
      headerAlign: "center",
      valueGetter: (value, row) => {
        const correctFields = (row as InputBookWithComputedFields)
          .correctFields;
        return countNonNullFields(correctFields);
      },
      renderCell: (params) => {
        const count = params.value as number;
        return (
          <Typography
            sx={{
              color: count > 0 ? "primary.main" : "text.disabled",
              fontWeight: count > 0 ? "medium" : "normal",
            }}
          >
            {count}
          </Typography>
        );
      },
    },
    {
      field: "score",
      headerName: "% Match",
      width: 100,
      type: "number",
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const score = params.value as number | undefined;
        if (score === undefined) {
          return <Typography color="text.disabled">-</Typography>;
        }

        const color =
          score > 0
            ? "success.main"
            : score < 0
            ? "error.main"
            : "text.secondary";
        return (
          <Typography
            sx={{
              color: color,
              fontWeight: "medium",
            }}
          >
            {score}
          </Typography>
        );
      },
    },
    {
      field: "lastTestDate",
      headerName: "Last Test",
      width: 160,
      type: "dateTime",
      renderCell: (params) => {
        const date = params.value as Date | null;
        if (!date) {
          return <Typography color="text.disabled">Never</Typography>;
        }

        // Use friendly format for dates within the last 7 days, otherwise use normal date/time
        const isRecent = isAfter(date, subDays(new Date(), 7));
        const displayText = isRecent
          ? formatDistanceToNow(date, { addSuffix: true })
          : date.toLocaleDateString() +
            " " +
            date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

        return (
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: "text.primary",
            }}
            title={date.toLocaleString()}
          >
            {displayText}
          </Typography>
        );
      },
    },
  ];

  // Add field-set metadata columns
  const metadataFields = getMetadataFields();
  metadataFields.forEach((field) => {
    columns.push({
      field: String(field.name),
      headerName: field.label,
      width: 150,
      valueGetter: (value, row) => {
        const correctFields = (row as InputBookWithComputedFields)
          .correctFields;
        return correctFields ? correctFields[field.name] : null;
      },
      valueFormatter: (value) => formatFieldValue(value, String(field.name)),
    });
  });

  // Convert data to GridRowsProp format
  const rows: GridRowsProp = data.map((item) => ({
    ...item,
  }));

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="h6" color="text.secondary">
          Loading evaluation data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <DataGridPro
        checkboxSelection
        onRowSelectionModelChange={(selectedRows: GridRowSelectionModel) => {
          // Debug: Log the actual structure of selectedRows to understand what we're working with
          console.log("selectedRows:", selectedRows);
          console.log("selectedRows.type:", selectedRows.type);
          console.log("selectedRows.ids:", selectedRows.ids);
          console.log("selectedRows.ids size:", selectedRows.ids?.size);

          // The gridRowId is already the book ID since we use the book ID as the row ID
          // The row ID is implicitly set to the book ID through the spread operator ...item  where item.id is the book's database ID from the book-input table.
          let selectedBookIds: number[] = [];

          if (selectedRows.type === "exclude") {
            // When type is 'exclude', it means "select all rows except those in the ids set"
            // So we need to get all row IDs and exclude the ones in the set
            const excludedIds = Array.from(selectedRows.ids || []);
            selectedBookIds = data
              .map((item) => item.id)
              .filter((id) => !excludedIds.includes(id));
          } else {
            // When type is 'include' (or undefined), it means "select only the rows in the ids set"
            selectedBookIds = Array.from(selectedRows.ids || []).map(
              (gridRowId: GridRowId) => Number(gridRowId)
            );
          }

          console.log("Final selectedBookIds:", selectedBookIds);
          onCheckboxSelectionChange?.(selectedBookIds);
        }}
        rows={rows}
        columns={columns}
        loading={loading}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        disableColumnSelector={false}
        disableRowSelectionOnClick={true}
        onRowClick={(params, event) => {
          // Check if the click target is within the checkbox cell
          const target = event.target as HTMLElement;
          const checkboxCell = target.closest('[data-field="__check__"]');

          if (checkboxCell) {
            // Click is on checkbox column, don't handle row selection
            return;
          }

          // Handle single row selection for details view
          const bookId = Number(params.id);
          setSelectedRowId([bookId]);
          onRowSelectionChange?.(bookId);
        }}
        slots={{
          toolbar: GridToolbar,
        }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        // disableMultipleRowSelection={true}
        isCellEditable={() => false}
        density="compact"
        sx={{
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid",
            borderBottomColor: "divider",
            cursor: "default",
            "&:focus": {
              outline: "none",
            },
            "&:focus-within": {
              outline: "none",
            },
          },
          "& .MuiDataGrid-cell--focused": {
            outline: "none !important",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "grey.50",
            borderBottom: "1px solid",
            borderBottomColor: "divider",
          },
          "& .MuiDataGrid-row": {
            "&:hover": {
              backgroundColor: "action.hover",
            },
            "&.selected-row": {
              backgroundColor: "#dbeafe", // Tailwind's blue-100
              "&:hover": {
                backgroundColor: "#bfdbfe", // Tailwind's blue-200
              },
            },
            // Hide default row selection styling
            "&.Mui-selected": {
              backgroundColor: "transparent !important",
              "&:hover": {
                backgroundColor: "action.hover !important",
              },
            },
          },
        }}
        getRowClassName={(params) => {
          return selectedRowId.includes(Number(params.id))
            ? "selected-row"
            : "";
        }}
      />
    </Box>
  );
};
