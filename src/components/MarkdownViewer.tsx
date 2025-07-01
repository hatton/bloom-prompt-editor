import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";

// Register markdown language
SyntaxHighlighter.registerLanguage("markdown", markdown);

interface MarkdownViewerProps {
  content: string;
  className?: string;
  customStyle?: React.CSSProperties;
  wrapLines?: boolean;
  wrapLongLines?: boolean;
}

export const MarkdownViewer = ({
  content,
  className,
  customStyle,
  wrapLines,
  wrapLongLines,
}: MarkdownViewerProps) => {
  return (
    <SyntaxHighlighter
      language="markdown"
      style={github}
      className={className}
      customStyle={customStyle}
      wrapLines={wrapLines}
      wrapLongLines={wrapLongLines}
    >
      {content}
    </SyntaxHighlighter>
  );
};
