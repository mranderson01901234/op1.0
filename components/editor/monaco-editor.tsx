"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type * as Monaco from "monaco-editor";
import type { OnMount, BeforeMount } from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
import type { OpenFile } from "@/contexts/editor-context";

// Dynamically import Monaco Editor to reduce initial bundle size
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-cyan-500/50 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-purple-500/50 rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-pink-500/50 rounded-full animate-pulse delay-200"></div>
          </div>
          <span className="text-sm text-gray-400 font-mono">Initializing editor...</span>
        </div>
      </div>
    ),
  }
);

interface MonacoEditorProps {
  value: string;
  language?: string;
  path?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  onSave?: (value: string) => void;
}

// Custom professional dark theme with glassmorphism
const customDarkTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: '818CF8' }, // Purple-500 (reverted to original)
    { token: 'string', foreground: '34D399' }, // Emerald-400
    { token: 'number', foreground: 'FCA5A5' }, // Red-300
    { token: 'type', foreground: '94A3B8' }, // Blue-gray-400 (changed to grey)
    { token: 'class', foreground: 'FDE047' }, // Yellow-300
    { token: 'function', foreground: 'C084FC' }, // Purple-400 (reverted to original)
    { token: 'variable', foreground: 'FDA4AF' }, // Pink-300
    { token: 'constant', foreground: '67E8F9' }, // Cyan-300
    { token: 'parameter', foreground: 'FCA5A5' }, // Red-300
    { token: 'property', foreground: 'A8A29E' }, // Stone-400 (grey instead of blue)
    { token: 'operator', foreground: 'E0E7FF' }, // Indigo-200 (reverted to original)
    { token: 'tag', foreground: '818CF8' }, // Purple-500 (reverted to original)
    { token: 'attribute.name', foreground: '34D399' }, // Emerald-400
    { token: 'attribute.value', foreground: 'FDBA74' }, // Orange-300
  ],
  colors: {
    'editor.background': '#0A0A0F',
    'editor.foreground': '#E2E8F0',
    'editor.lineHighlightBackground': '#1E1E2E20',
    'editor.selectionBackground': '#71717A40',
    'editor.inactiveSelectionBackground': '#71717A20',
    'editorLineNumber.foreground': '#3F3F46',
    'editorLineNumber.activeForeground': '#71717A',
    'editorCursor.foreground': '#818CF8',
    'editor.wordHighlightBackground': '#71717A30',
    'editor.wordHighlightStrongBackground': '#94A3B840',
    'editor.findMatchBackground': '#FDE04750',
    'editor.findMatchHighlightBackground': '#FDE04730',
    'editorBracketMatch.background': '#71717A30',
    'editorBracketMatch.border': '#94A3B860',
    'editorGutter.background': '#0A0A0F',
    'editorWidget.background': '#0F0F17',
    'editorWidget.border': '#27272A',
    'editorSuggestWidget.background': '#0F0F17E0',
    'editorSuggestWidget.border': '#27272A60',
    'editorSuggestWidget.selectedBackground': '#71717A20',
    'editorHoverWidget.background': '#0F0F17E0',
    'editorHoverWidget.border': '#71717A40',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#27272A60',
    'scrollbarSlider.hoverBackground': '#3F3F4690',
    'scrollbarSlider.activeBackground': '#52525BB0',
    'editorGroup.border': '#3F3F46',
    'editorGroupHeader.tabsBorder': '#3F3F46',
    'panel.border': '#3F3F46',
    'sideBar.border': '#3F3F46',
    'activityBar.border': '#3F3F46',
    'statusBar.border': '#3F3F46',
    'titleBar.border': '#3F3F46',
    'editor.border': '#3F3F46',
    'editorOverviewRuler.border': '#3F3F46',
    'focusBorder': '#52525B',
    'contrastBorder': '#3F3F46',
  },
};

export function MonacoEditor({
  value,
  language = "plaintext",
  path,
  readOnly = false,
  onChange,
  onSave,
}: MonacoEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    // Define the custom theme
    monaco.editor.defineTheme('opera-dark', customDarkTheme);
    setIsThemeLoaded(true);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add save keybinding (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave && !readOnly) {
        const currentValue = editor.getValue();
        onSave(currentValue);
      }
    });

    // Focus editor
    editor.focus();
  };

  // Auto-detect language from file extension
  const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      md: "markdown",
      py: "python",
      rb: "ruby",
      go: "go",
      rs: "rust",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      sql: "sql",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      ps1: "powershell",
      dockerfile: "dockerfile",
      graphql: "graphql",
      vue: "vue",
      svelte: "svelte",
    };
    return languageMap[ext || ""] || "plaintext";
  };

  const detectedLanguage = path ? getLanguageFromPath(path) : language;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Glassmorphism background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/10 via-transparent to-slate-700/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl" />
      </div>

      {/* Glass container with backdrop blur */}
      <div className="relative h-full w-full backdrop-blur-sm bg-slate-950/40 border border-slate-800/50 shadow-2xl">
        {/* Top glass bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-900/60 to-transparent pointer-events-none z-10" />

        {/* Editor */}
        <Editor
          height="100%"
          language={detectedLanguage}
          value={value}
          theme="opera-dark"
          onChange={onChange}
          beforeMount={handleBeforeMount}
          options={{
            readOnly,
            minimap: {
              enabled: true,
              renderCharacters: false,
              maxColumn: 120,
              showSlider: "mouseover"
            },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            rulers: [80, 120],
            wordWrap: "off",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            folding: true,
            foldingStrategy: "indentation",
            renderLineHighlight: "all",
            lineDecorationsWidth: 5,
            lineNumbersMinChars: 4,
            glyphMargin: true,
            bracketPairColorization: {
              enabled: true,
              independentColorPoolPerBracketType: true,
            },
            padding: {
              top: 20,
              bottom: 20,
            },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorStyle: "line-thin",
            renderWhitespace: "selection",
            guides: {
              indentation: true,
              bracketPairs: true,
              highlightActiveIndentation: true,
            },
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
            },
            inlineSuggest: {
              enabled: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            parameterHints: {
              enabled: true,
              cycle: true,
            },
            formatOnType: true,
            formatOnPaste: true,
            dragAndDrop: true,
            linkedEditing: true,
            hover: {
              enabled: true,
              delay: 300,
            },
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorModifier: "alt",
            accessibilitySupport: "auto",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoSurround: "languageDefined",
            autoIndent: "advanced",
            stickyTabStops: true,
            roundedSelection: true,
            largeFileOptimizations: true,
          }}
          onMount={handleEditorDidMount}
        />

        {/* Bottom glass reflection */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
      </div>
    </div>
  );
}
