import React, { useState, useEffect, useCallback } from "react";
import {
  DataGridPro,
  GridColDef,
  GridToolbar,
  GridRowsProp,
  GridFilterModel,
  GridSortModel,
  GridColumnVisibilityModel,
} from "@mui/x-data-grid-pro";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getScore } from "@/lib/scoring";
import { getMetadataFields } from "@/components/FieldSetEditor";

type BookInput = Tables<"book-input">;

// Extended interface with computed fields
interface InputBookWithComputedFields extends BookInput {
  wordCount: number;
  score: number | undefined;
  correctFields: Tables<"field-set"> | null;
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
const formatFieldValue = (value: unknown, fieldName: string): string => {
  if (value === null || value === undefined) return "-";

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

interface EvalGridState {
  filterModel: GridFilterModel;
  sortModel: GridSortModel;
  columnVisibilityModel: GridColumnVisibilityModel;
}

export const EvalGridMui: React.FC = () => {
  const [data, setData] = useState<InputBookWithComputedFields[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

          return {
            ...book,
            wordCount: countWords(book.ocr_markdown),
            score,
            correctFields,
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
  }, [toast]);

  useEffect(() => {
    loadBookInputs();
  }, [loadBookInputs]);

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
      headerName: "Correct Fields",
      width: 150,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => formatFieldValue(value, "correct_fields"),
    },
    {
      field: "score",
      headerName: "Score",
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
  ];

  // Add field-set metadata columns
  const metadataFields = getMetadataFields();
  metadataFields.forEach((field) => {
    columns.push({
      field: field.name,
      headerName: field.label,
      width: 150,
      valueGetter: (value, row) => {
        const correctFields = (row as InputBookWithComputedFields)
          .correctFields;
        return correctFields ? correctFields[field.name] : null;
      },
      valueFormatter: (value) => formatFieldValue(value, field.name),
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
        rows={rows}
        columns={columns}
        loading={loading}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
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
        checkboxSelection
        disableRowSelectionOnClick
        density="compact"
        sx={{
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid",
            borderBottomColor: "divider",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "grey.50",
            borderBottom: "1px solid",
            borderBottomColor: "divider",
          },
        }}
      />
    </Box>
  );
};
