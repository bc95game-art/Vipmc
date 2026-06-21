import { useState } from "react";
import { Search, ChevronRight, Loader2, FileText, Code2, Replace, XCircle } from "lucide-react";
import { SearchResult } from "@/lib/apk-utils";

interface SearchPanelProps {
  onSearch: (query: string, options: { regex: boolean; caseSensitive: boolean; filePattern: string }) => Promise<SearchResult[]>;
  onResultClick: (result: SearchResult) => void;
}

function HighlightedText({ text, query, isRegex, caseSensitive }: { text: string; query: string; isRegex: boolean; caseSensitive: boolean }) {
  if (!query) return <>{text}</>;
  try {
    const flags = caseSensitive ? "g" : "gi";
    const pattern = isRegex
      ? new RegExp(query, flags)
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const parts = text.split(pattern);
    const matches = Array.from(text.matchAll(pattern)).map(m => m[0]);
    return (
      <>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < matches.length && (
              <mark className="bg-yellow-500/40 text-yellow-200 rounded-[2px] px-px">{matches[i]}</mark>
            )}
          </span>
        ))}
      </>
    );
  } catch { return <>{text}</>; }
}

function FileResultGroup({ file, results, query, isRegex, caseSensitive, onResultClick }: {
  file: string; results: SearchResult[]; query: string; isRegex: boolean; caseSensitive: boolean;
  onResultClick: (r: SearchResult) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const fileName = file.split("/").pop() || file;
  const dir = file.includes("/") ? file.substring(0, file.lastIndexOf("/")) : "";

  return (
    <div className="border-b border-[#252526]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 transition-colors text-left"
      >
        <ChevronRight size={10} className={`text-gray-500 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`} />
        <span className="text-xs text-[#4ec9b0] font-medium truncate">{fileName}</span>
        {dir && <span className="text-[10px] text-gray-600 truncate">{dir}</span>}
        <span className="ml-auto text-[10px] text-gray-500 bg-[#2d2d2d] px-1.5 py-0.5 rounded-full flex-shrink-0">{results.length}</span>
      </button>
      {expanded && (
        <div>
          {results.map((result, i) => (
            <button key={i} onClick={() => onResultClick(result)}
              className="w-full flex items-start gap-2 px-3 py-1 hover:bg-[#094771] transition-colors text-left group border-l-2 border-transparent hover:border-[#007acc]">
              <span className="text-[10px] text-gray-600 font-mono w-8 text-right flex-shrink-0 mt-0.5 group-hover:text-[#569cd6]">{result.line}</span>
              <span className="text-[11px] text-gray-400 font-mono truncate flex-1 leading-relaxed">
                <HighlightedText text={result.content.slice(0, 150)} query={query} isRegex={isRegex} caseSensitive={caseSensitive} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchPanel({ onSearch, onResultClick }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [filePattern, setFilePattern] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.file]) acc[r.file] = [];
    acc[r.file].push(r);
    return acc;
  }, {});

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await onSearch(query, { regex: useRegex, caseSensitive, filePattern });
      setResults(res);
      setSearched(true);
    } finally { setSearching(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="p-3 space-y-2 border-b border-[#2d2d2d] flex-shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input type="text" placeholder="جستجو در همه فایل‌ها..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-[#2d2d2d] text-xs text-gray-200 placeholder-gray-600 pl-8 pr-3 py-2 rounded border border-[#3d3d3d] focus:outline-none focus:border-[#007acc] transition-colors" />
        </div>

        <div className="relative">
          <FileText size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input type="text" placeholder="فیلتر فایل: *.xml یا res/**" value={filePattern}
            onChange={(e) => setFilePattern(e.target.value)}
            className="w-full bg-[#2d2d2d] text-xs text-gray-200 placeholder-gray-600 pl-8 pr-3 py-1.5 rounded border border-[#3d3d3d] focus:outline-none focus:border-[#007acc] transition-colors" />
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setUseRegex(!useRegex)}
            title="Regular Expression"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${useRegex ? "bg-[#007acc]/20 border-[#007acc] text-[#569cd6]" : "bg-[#2d2d2d] border-[#3d3d3d] text-gray-500 hover:text-gray-300"}`}>
            <Code2 size={10} /> .*
          </button>
          <button onClick={() => setCaseSensitive(!caseSensitive)}
            title="Case Sensitive"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${caseSensitive ? "bg-[#007acc]/20 border-[#007acc] text-[#569cd6]" : "bg-[#2d2d2d] border-[#3d3d3d] text-gray-500 hover:text-gray-300"}`}>
            Aa
          </button>
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-[#3d3d3d] bg-[#2d2d2d] text-gray-500 hover:text-red-400 transition-colors">
              <XCircle size={10} />
            </button>
          )}
          <button onClick={handleSearch} disabled={searching || !query.trim()}
            className="ml-auto flex items-center gap-1 px-3 py-1 bg-[#007acc] hover:bg-[#005a9e] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] rounded transition-colors">
            {searching ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
            جستجو
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {searching && (
          <div className="flex items-center justify-center h-20 gap-2 text-gray-500 text-xs">
            <Loader2 size={14} className="animate-spin text-[#007acc]" />
            در حال جستجو در فایل‌ها...
          </div>
        )}

        {searched && !searching && (
          <div className="px-3 py-1.5 text-[11px] text-gray-500 border-b border-[#2d2d2d] flex items-center justify-between bg-[#252526]">
            <span>{results.length} نتیجه در {Object.keys(grouped).length} فایل</span>
            {results.length >= 1000 && <span className="text-yellow-500 text-[10px]">نتایج به ۱۰۰۰ محدود شد</span>}
          </div>
        )}

        {Object.entries(grouped).map(([file, fileResults]) => (
          <FileResultGroup key={file} file={file} results={fileResults} query={query}
            isRegex={useRegex} caseSensitive={caseSensitive} onResultClick={onResultClick} />
        ))}

        {searched && !searching && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs gap-2">
            <Search size={24} className="text-gray-700" />
            <span>نتیجه‌ای یافت نشد</span>
            <span className="text-gray-700 text-[10px]">عبارت جستجو یا فیلتر را تغییر دهید</span>
          </div>
        )}
      </div>
    </div>
  );
}
