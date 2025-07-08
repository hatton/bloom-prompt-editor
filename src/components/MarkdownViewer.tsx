import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
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
  splitView?: boolean;
  showDiffOnly?: boolean;
}

export const MarkdownViewer = ({
  content,
  className,
  customStyle,
  wrapLines,
  wrapLongLines,
  compareWithText,
  splitView = false,
  showDiffOnly = false,
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
        splitView={splitView}
        showDiffOnly={showDiffOnly}
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
    const {
      content,
      compareWithText,
      splitView = false,
      showDiffOnly = false,
      ...rest
    } = this.props;

    if (!compareWithText || compareWithText.trim() === "") {
      return <MarkdownViewer content={content} {...rest} />;
    }
    return (
      <div style={{ height: "100%", overflowY: "auto" }}>
        <ReactDiffViewer
          oldValue={compareWithText}
          newValue={content}
          splitView={splitView}
          hideLineNumbers={true}
          hideMarkers={true}
          showDiffOnly={showDiffOnly}
          extraLinesSurroundingDiff={1}
          compareMethod={DiffMethod.WORDS}
          {...rest}
        />
      </div>
    );
  }
}
