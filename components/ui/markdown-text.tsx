import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';

interface MarkdownProps {
  content: string;
  colors: any;
  onLinkPress?: (url: string) => void;
}

export function MarkdownText({ content, colors, onLinkPress }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let isCodeBlock = false;
  let codeBlockLines: string[] = [];
  let isTable = false;
  let tableRows: string[] = [];

  // Detect dark theme based on text color token
  const isDark = colors.text === '#ECEDEE';
  const themeStyles = {
    codeBg: isDark ? '#141619' : '#FFFFFF',
    blockquoteBg: isDark ? '#1C1F22' : '#F8F9FA',
    inlineCodeBg: isDark ? '#2D3139' : '#E4E6EB',
    borderColor: isDark ? '#2A2D34' : '#D0D4DC',
    textColor: colors.text || (isDark ? '#ECEDEE' : '#11181C'),
  };

  const parseRow = (rowStr: string) => {
    const cols = rowStr.split('|').map(c => c.trim());
    if (rowStr.startsWith('|')) cols.shift();
    if (rowStr.endsWith('|')) cols.pop();
    return cols;
  };

  const renderTableElement = (rows: string[], key: string) => {
    const parsedRows = rows
      .map(r => parseRow(r))
      .filter(cols => {
        // Discard divider rows like |---|---|
        return cols.length > 0 && !cols.every(col => col.match(/^:?-+:?$/));
      });

    if (parsedRows.length === 0) return null;

    const headers = parsedRows[0];
    const dataRows = parsedRows.slice(1);

    return (
      <View
        key={key}
        style={[
          styles.tableContainer,
          {
            borderColor: themeStyles.borderColor,
            backgroundColor: themeStyles.codeBg,
          },
        ]}
      >
        {/* Table Header Row */}
        <View
          style={[
            styles.tableHeaderRow,
            {
              backgroundColor: themeStyles.inlineCodeBg,
              borderBottomColor: themeStyles.borderColor,
            },
          ]}
        >
          {headers.map((h, colIdx) => (
            <View key={`h-${colIdx}`} style={styles.tableCell}>
              <Text style={[styles.tableHeaderText, { color: themeStyles.textColor }]}>
                {renderInlineText(h, colors, themeStyles, onLinkPress)}
              </Text>
            </View>
          ))}
        </View>

        {/* Table Data Rows */}
        {dataRows.map((row, rowIdx) => {
          const isLast = rowIdx === dataRows.length - 1;
          return (
            <View
              key={`row-${rowIdx}`}
              style={[
                styles.tableRow,
                {
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: themeStyles.borderColor,
                },
              ]}
            >
              {row.map((cell, colIdx) => (
                <View key={`c-${rowIdx}-${colIdx}`} style={styles.tableCell}>
                  <Text style={[styles.tableText, { color: themeStyles.textColor }]}>
                    {renderInlineText(cell, colors, themeStyles, onLinkPress)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // 1. Code block toggle
    if (trimmed.startsWith('```')) {
      if (isTable && tableRows.length > 0) {
        elements.push(renderTableElement(tableRows, `table-before-code-${idx}`));
        tableRows = [];
        isTable = false;
      }

      if (isCodeBlock) {
        // End of code block
        elements.push(
          <View
            key={`codeblock-${idx}`}
            style={[
              styles.codeBlock,
              {
                backgroundColor: themeStyles.codeBg,
                borderColor: themeStyles.borderColor,
              },
            ]}
          >
            <Text style={[styles.codeBlockText, { color: themeStyles.textColor }]}>
              {codeBlockLines.join('\n')}
            </Text>
          </View>
        );
        codeBlockLines = [];
        isCodeBlock = false;
      } else {
        // Start of code block
        isCodeBlock = true;
      }
      continue;
    }

    if (isCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Table row parsing
    if (trimmed.startsWith('|')) {
      tableRows.push(line);
      isTable = true;
      continue;
    } else {
      if (isTable && tableRows.length > 0) {
        elements.push(renderTableElement(tableRows, `table-before-${idx}`));
        tableRows = [];
        isTable = false;
      }
    }

    // 3. Unordered List Item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = line.substring(line.indexOf(trimmed.charAt(0)) + 2);
      const hasButtons = hasInteractiveButtons(bulletText);

      elements.push(
        <View key={idx} style={styles.listItem}>
          <Text style={[styles.bullet, { color: themeStyles.textColor }]}>•</Text>
          {hasButtons ? (
            <View style={styles.lineWrapper}>
              {renderBlockText(bulletText, colors, themeStyles, onLinkPress)}
            </View>
          ) : (
            <Text style={[styles.paragraph, { color: themeStyles.textColor }]}>
              {renderInlineText(bulletText, colors, themeStyles, onLinkPress)}
            </Text>
          )}
        </View>
      );
      continue;
    }

    // 4. Numbered List Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const numPrefix = numMatch[1] + '.';
      const itemText = numMatch[2];
      const hasButtons = hasInteractiveButtons(itemText);

      elements.push(
        <View key={idx} style={styles.listItem}>
          <Text style={[styles.numberPrefix, { color: themeStyles.textColor }]}>{numPrefix}</Text>
          {hasButtons ? (
            <View style={styles.lineWrapper}>
              {renderBlockText(itemText, colors, themeStyles, onLinkPress)}
            </View>
          ) : (
            <Text style={[styles.paragraph, { color: themeStyles.textColor }]}>
              {renderInlineText(itemText, colors, themeStyles, onLinkPress)}
            </Text>
          )}
        </View>
      );
      continue;
    }

    // 5. Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <View key={idx} style={styles.headerWrapper}>
          <Text style={[styles.h3, { color: themeStyles.textColor }]}>
            {renderInlineText(trimmed.substring(4), colors, themeStyles, onLinkPress)}
          </Text>
        </View>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <View key={idx} style={styles.headerWrapper}>
          <Text style={[styles.h2, { color: themeStyles.textColor }]}>
            {renderInlineText(trimmed.substring(3), colors, themeStyles, onLinkPress)}
          </Text>
        </View>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <View key={idx} style={styles.headerWrapper}>
          <Text style={[styles.h1, { color: themeStyles.textColor }]}>
            {renderInlineText(trimmed.substring(2), colors, themeStyles, onLinkPress)}
          </Text>
        </View>
      );
      continue;
    }

    // 6. Blockquote
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.startsWith('> ') ? trimmed.substring(2) : trimmed.substring(1);
      const hasButtons = hasInteractiveButtons(quoteText);

      elements.push(
        <View
          key={idx}
          style={[
            styles.blockquote,
            {
              borderLeftColor: colors.userBubble || '#0a7ea4',
              backgroundColor: themeStyles.blockquoteBg,
            },
          ]}
        >
          {hasButtons ? (
            <View style={styles.lineWrapper}>
              {renderBlockText(quoteText, colors, themeStyles, onLinkPress)}
            </View>
          ) : (
            <Text style={[styles.paragraph, { color: themeStyles.textColor }]}>
              {renderInlineText(quoteText, colors, themeStyles, onLinkPress)}
            </Text>
          )}
        </View>
      );
      continue;
    }

    // 7. Empty Line
    if (trimmed === '') {
      elements.push(<View key={idx} style={{ height: 6 }} />);
      continue;
    }

    // 8. Regular Text line
    const hasButtons = hasInteractiveButtons(line);
    if (hasButtons) {
      elements.push(
        <View key={idx} style={styles.lineWrapper}>
          {renderBlockText(line, colors, themeStyles, onLinkPress)}
        </View>
      );
    } else {
      elements.push(
        <Text key={idx} style={[styles.paragraph, { color: themeStyles.textColor }]}>
          {renderInlineText(line, colors, themeStyles, onLinkPress)}
        </Text>
      );
    }
  }

  // Handle unclosed table
  if (isTable && tableRows.length > 0) {
    elements.push(renderTableElement(tableRows, 'table-end-eof'));
  }

  // Handle unclosed code block
  if (isCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <View
        key={`codeblock-unclosed`}
        style={[
          styles.codeBlock,
          {
            backgroundColor: themeStyles.codeBg,
            borderColor: themeStyles.borderColor,
          },
        ]}
      >
        <Text style={[styles.codeBlockText, { color: themeStyles.textColor }]}>
          {codeBlockLines.join('\n')}
        </Text>
      </View>
    );
  }

  return <View style={styles.container}>{elements}</View>;
}

// Check if line contains interactive buttons to fallback to flex block layout
function hasInteractiveButtons(text: string): boolean {
  const regex = /\[[^\]]+\]\(action:\/\/[^)]+\)/;
  return regex.test(text);
}

// 1. Inline renderer for standard text (guarantees perfect text wrapping)
function renderInlineText(text: string, colors: any, themeStyles: any, onLinkPress?: (url: string) => void) {
  const parts: React.ReactNode[] = [];
  let keyIdx = 0;

  // Regex matches markdown tags
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.*?)\*\*|\*(.*?)\*|`([^`]+)`/g;
  let match;
  let lastIndex = 0;

  const defaultStyle = {
    color: themeStyles.textColor,
    fontSize: 13,
    lineHeight: 19,
  };

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (match[1] && match[2]) {
      const label = match[1];
      const url = match[2];
      parts.push(
        <Text
          key={`link-${keyIdx++}`}
          style={[styles.webLink, { color: colors.userBubble || '#0a7ea4' }]}
          onPress={() => onLinkPress?.(url)}
        >
          {label}
        </Text>
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <Text key={`b-${keyIdx++}`} style={styles.bold}>
          {match[3]}
        </Text>
      );
    } else if (match[4] !== undefined) {
      parts.push(
        <Text key={`i-${keyIdx++}`} style={styles.italic}>
          {match[4]}
        </Text>
      );
    } else if (match[5] !== undefined) {
      parts.push(
        <Text
          key={`c-${keyIdx++}`}
          style={[
            styles.inlineCodeText,
            {
              backgroundColor: themeStyles.inlineCodeBg,
            },
          ]}
        >
          {` ${match[5]} `}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// 2. Block renderer for lists/rows that contain action buttons
function renderBlockText(text: string, colors: any, themeStyles: any, onLinkPress?: (url: string) => void) {
  const parts: React.ReactNode[] = [];
  let keyIdx = 0;

  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.*?)\*\*|\*(.*?)\*|`([^`]+)`/g;
  let match;
  let lastIndex = 0;

  const textStyle = {
    color: themeStyles.textColor,
    fontSize: 13,
    lineHeight: 19,
  };

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(
        <Text key={`t-${keyIdx++}`} style={textStyle}>
          {text.substring(lastIndex, matchIndex)}
        </Text>
      );
    }

    if (match[1] && match[2]) {
      const label = match[1];
      const url = match[2];
      const isAction = url.startsWith('action://');

      if (isAction) {
        parts.push(
          <Pressable
            key={`act-${keyIdx++}`}
            onPress={() => onLinkPress?.(url)}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.userBubble || '#0a7ea4',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.actionButtonText}>{label}</Text>
          </Pressable>
        );
      } else {
        parts.push(
          <Text
            key={`link-${keyIdx++}`}
            style={[styles.webLink, { color: colors.userBubble || '#0a7ea4', fontSize: 13 }]}
            onPress={() => onLinkPress?.(url)}
          >
            {label}
          </Text>
        );
      }
    } else if (match[3] !== undefined) {
      parts.push(
        <Text key={`b-${keyIdx++}`} style={[styles.bold, textStyle]}>
          {match[3]}
        </Text>
      );
    } else if (match[4] !== undefined) {
      parts.push(
        <Text key={`i-${keyIdx++}`} style={[styles.italic, textStyle]}>
          {match[4]}
        </Text>
      );
    } else if (match[5] !== undefined) {
      parts.push(
        <Text
          key={`c-${keyIdx++}`}
          style={[
            styles.inlineCodeText,
            {
              backgroundColor: themeStyles.inlineCodeBg,
              color: themeStyles.textColor,
            },
          ]}
        >
          {` ${match[5]} `}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${keyIdx++}`} style={textStyle}>
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return parts;
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  lineWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 1,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
    marginVertical: 1.5,
  },
  bullet: {
    fontSize: 14,
    marginRight: 8,
    lineHeight: 19,
  },
  numberPrefix: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
    lineHeight: 19,
  },
  headerWrapper: {
    marginVertical: 6,
  },
  h1: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 4,
    borderRadius: 2,
  },
  codeBlock: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  codeBlockText: {
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inlineCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11.5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  webLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 4,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 6,
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  tableText: {
    fontSize: 12,
  },
});
