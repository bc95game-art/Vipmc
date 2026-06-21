import { useRef } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { getLanguage, getFileIcon } from "@/lib/apk-utils";
import { Save, Download, Cpu } from "lucide-react";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  modified: boolean;
}

interface CodeEditorProps {
  tabs: OpenTab[];
  activeTab: string | null;
  onTabChange: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
}

export function CodeEditor({
  tabs, activeTab, onTabChange, onTabClose, onContentChange, onSave,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const activeTabData = tabs.find((t) => t.path === activeTab);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => { if (activeTab) onSave(activeTab); },
    });
    editor.addAction({
      id: "close-tab",
      label: "Close Tab",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW],
      run: () => { if (activeTab) onTabClose(activeTab); },
    });
  };

  const handleDownload = () => {
    if (!activeTabData) return;
    const blob = new Blob([activeTabData.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = activeTabData.name; a.click();
    URL.revokeObjectURL(url);
  };

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-gray-600 select-none">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 mx-auto bg-[#252526] rounded-xl flex items-center justify-center border border-[#3d3d3d]">
            <Cpu size={32} className="text-[#007acc]/40" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">APK Studio Pro</p>
            <p className="text-gray-600 text-xs">یک فایل متنی را از درخت فایل انتخاب کنید</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700">
            {[["Ctrl+S", "ذخیره فایل"], ["Ctrl+W", "بستن تب"], ["Ctrl+Z", "بازگشت"], ["Ctrl+F", "جستجو"]].map(([k, v]) => (
              <div key={k} className="bg-[#252526] rounded px-2 py-1.5 flex items-center justify-between gap-2 border border-[#2d2d2d]">
                <code className="text-[#569cd6] font-mono text-[10px]">{k}</code>
                <span className="text-gray-600">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Tab bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto scrollbar-thin flex-shrink-0 min-h-[35px]">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => onTabChange(tab.path)}
            className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-[#1e1e1e] max-w-[200px] flex-shrink-0 group transition-colors ${
              activeTab === tab.path
                ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]"
                : "text-gray-400 hover:text-gray-300 hover:bg-[#2a2a2a]"
            }`}
          >
            <span className="text-xs flex-shrink-0">{getFileIcon({ name: tab.name, path: tab.path, size: 0, isDirectory: false })}</span>
            <span className="text-xs truncate">{tab.name}</span>
            {tab.modified && <span className="text-yellow-400 text-[10px] flex-shrink-0">●</span>}
            <button
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.path); }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Action bar */}
      {activeTabData && (
        <div className="flex items-center gap-2 px-3 py-1 bg-[#252526] border-b border-[#1e1e1e] flex-shrink-0">
          <span className="text-[11px] text-gray-500 flex-1 truncate font-mono">{activeTabData.path}</span>
          <button
            onClick={() => onSave(activeTabData.path)}
            disabled={!activeTabData.modified}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#007acc] hover:bg-[#005a9e] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Save size={10} /> ذخیره
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 rounded transition-colors border border-[#3d3d3d]"
          >
            <Download size={10} /> دانلود
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeTabData ? (
          <MonacoEditor
            key={activeTabData.path}
            height="100%"
            language={getLanguage(activeTabData.name)}
            value={activeTabData.content}
            theme="vs-dark"
            onMount={handleMount}
            onChange={(v) => onContentChange(activeTabData.path, v ?? "")}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
              fontLigatures: true,
              lineNumbers: "on",
              minimap: { enabled: true, renderCharacters: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              renderLineHighlight: "all",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              padding: { top: 8, bottom: 8 },
              suggest: { showKeywords: true },
              quickSuggestions: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            فایل باینری — قابل ویرایش به صورت متن نیست
          </div>
        )}
      </div>
    </div>
  );
}
