import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";
import ReactDiffViewer from "react-diff-viewer-continued";
import React, { PureComponent } from "react";
// Register markdown language
SyntaxHighlighter.registerLanguage("markdown", markdown);

interface MarkdownViewerProps {
  content: string;
  className?: string;
  customStyle?: React.CSSProperties;
  wrapLines?: boolean;
  wrapLongLines?: boolean;
  compareWithText?: string;
}

export const MarkdownViewer = ({
  content,
  className,
  customStyle,
  wrapLines,
  wrapLongLines,
  compareWithText,
}: MarkdownViewerProps) => {
  if (!content || content.trim() === "") {
    return "";
  }
  if (compareWithText) {
    // do a diff between content and compareWithText
    return (
      <MarkdownDiffViewer
        content={content}
        compareWithText={compareWithText}
        className={className}
        customStyle={customStyle}
        wrapLines={wrapLines}
        wrapLongLines={wrapLongLines}
      />
    );
  }
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
export class MarkdownDiffViewer extends PureComponent<MarkdownViewerProps> {
  render() {
    const { content, compareWithText, ...rest } = this.props;
    return (
      <ReactDiffViewer
        oldValue={compareWithText}
        newValue={content}
        splitView={false}
        hideLineNumbers={true}
        hideMarkers={true}
        {...rest}
      />
    );
  }
}
