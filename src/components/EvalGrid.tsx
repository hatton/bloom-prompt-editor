import React, { useState, useEffect, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ArrowUpDown, MoreHorizontal, Settings } from "lucide-react";

type BookInput = Tables<"book-input">;

// Extended interface with computed fields
interface InputBookWithComputedFields extends BookInput {
  wordCount: number;
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

// Helper function to format field names for display
const formatFieldName = (fieldName: string): string => {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
}

export const EvalGrid: React.FC = () => {
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [data, setData] = useState<InputBookWithComputedFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const { toast } = useToast();

  // Load book inputs from Supabase
  const loadBookInputs = useCallback(async () => {
    try {
      const { data: bookData, error } = await supabase
        .from("book-input")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookInputs(bookData || []);

      // Transform book inputs to include computed fields
      const transformedData: InputBookWithComputedFields[] = (
        bookData || []
      ).map((book) => ({
        ...book,
        wordCount: countWords(book.ocr_markdown),
      }));

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

  // Store grid state in localStorage
  const [gridState, setGridState] = useLocalStorage<EvalGridState>(
    "evalGridState",
    {
      sorting: [],
      columnFilters: [],
      columnVisibility: {},
    }
  );

  const [sorting, setSorting] = useState<SortingState>(gridState.sorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    gridState.columnFilters
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    gridState.columnVisibility
  );

  // Update localStorage whenever state changes
  useEffect(() => {
    setGridState({
      sorting,
      columnFilters,
      columnVisibility,
    });
  }, [sorting, columnFilters, columnVisibility, setGridState]);

  // Generate columns dynamically based on the book-input table structure
  const columns: ColumnDef<InputBookWithComputedFields>[] = [
    // Main fields from book-input table
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("id")}</div>
      ),
    },
    {
      accessorKey: "label",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Label
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium max-w-xs truncate">
          {row.getValue("label") || "Untitled"}
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>{formatFieldValue(row.getValue("created_at"), "created_at")}</div>
      ),
    },
    {
      accessorKey: "wordCount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Word Count
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("wordCount")}</div>
      ),
    },
    {
      accessorKey: "ocr_markdown",
      header: "OCR Content",
      cell: ({ row }) => {
        const content = row.getValue("ocr_markdown") as string | null;
        const preview = content
          ? content.substring(0, 100) + (content.length > 100 ? "..." : "")
          : "-";
        return (
          <div
            className="max-w-xs truncate text-sm text-gray-600"
            title={content || ""}
          >
            {preview}
          </div>
        );
      },
    },
    {
      accessorKey: "reference_markdown",
      header: "Reference Content",
      cell: ({ row }) => {
        const content = row.getValue("reference_markdown") as string | null;
        const preview = content
          ? content.substring(0, 100) + (content.length > 100 ? "..." : "")
          : "-";
        return (
          <div
            className="max-w-xs truncate text-sm text-gray-600"
            title={content || ""}
          >
            {preview}
          </div>
        );
      },
    },
    {
      accessorKey: "correct_fields",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Correct Fields
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {formatFieldValue(row.getValue("correct_fields"), "correct_fields")}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  return (
    <div className="w-full h-full flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="text-lg">Loading evaluation data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search all columns..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="max-w-sm"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <Settings className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No input books found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer with row count */}
          <div className="flex items-center justify-end space-x-2 p-4 border-t">
            <div className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} of{" "}
              {table.getCoreRowModel().rows.length} row(s) shown.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
