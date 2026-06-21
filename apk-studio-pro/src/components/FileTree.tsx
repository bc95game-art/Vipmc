import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Search, X, FolderOpen, Folder } from "lucide-react";
import { ApkFile, getFileIcon, formatFileSize } from "@/lib/apk-utils";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  files: ApkFile[];
  selectedFile?: string;
  onFileSelect: (file: ApkFile) => void;
  modifiedFiles?: Set<string>;
}

function matchesSearch(file: ApkFile, q: string): boolean {
  if (!q) return true;
  if (file.name.toLowerCase().includes(q)) return true;
  if (file.children) return file.children.some((c) => matchesSearch(c, q));
  return false;
}

function TreeNode({
  file, depth, selectedFile, onFileSelect, modifiedFiles, searchQuery,
}: {
  file: ApkFile; depth: number; selectedFile?: string;
  onFileSelect: (f: ApkFile) => void; modifiedFiles?: Set<string>; searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isSelected = selectedFile === file.path;
  const isModified = modifiedFiles?.has(file.path);
  const q = searchQuery.toLowerCase();

  const visibleChildren = useMemo(() => {
    if (!file.children) return [];
    if (!searchQuery) return file.children;
    return file.children.filter((c) => matchesSearch(c, q));
  }, [file.children, searchQuery, q]);

  if (searchQuery && !matchesSearch(file, q)) return null;

  return (
    <div>
      <div
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: "8px" }}
        className={cn(
          "flex items-center gap-1 py-[3px] cursor-pointer rounded-sm group select-none transition-colors hover:bg-white/5",
          isSelected && "bg-[#094771] hover:bg-[#094771]"
        )}
        onClick={() => file.isDirectory ? setExpanded(!expanded) : onFileSelect(file)}
      >
        {file.isDirectory ? (
          <span className="text-gray-400 w-4 h-4 flex items-center justify-center flex-shrink-0">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <span className="text-sm leading-none mr-1 flex-shrink-0">
          {file.isDirectory
            ? expanded
              ? <FolderOpen size={14} className="text-[#dcb67a]" />
              : <Folder size={14} className="text-[#dcb67a]" />
            : getFileIcon(file)}
        </span>

        <span className={cn(
          "text-xs truncate flex-1 min-w-0",
          file.isDirectory ? "text-gray-200 font-medium" : "text-gray-300",
          isSelected && "text-white",
          isModified && "text-yellow-400"
        )}>
          {file.name}
          {isModified && <span className="ml-1 text-yellow-500 text-[10px]">●</span>}
        </span>

        {!file.isDirectory && file.size > 0 && (
          <span className="text-[10px] text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      {file.isDirectory && expanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) => (
            <TreeNode key={child.path} file={child} depth={depth + 1} selectedFile={selectedFile}
              onFileSelect={onFileSelect} modifiedFiles={modifiedFiles} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ files, selectedFile, onFileSelect, modifiedFiles }: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="px-2 py-2 border-b border-[#2d2d2d] flex-shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="فیلتر فایل‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#2d2d2d] text-xs text-gray-300 placeholder-gray-600 pl-6 pr-6 py-1.5 rounded border border-[#3d3d3d] focus:outline-none focus:border-[#007acc] transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs gap-2 px-4 text-center">
            <Folder size={28} className="text-gray-700 mb-1" />
            <span>فایل APK را بارگذاری کنید</span>
            <span className="text-gray-700">تا ساختار فایل‌ها نمایش داده شود</span>
          </div>
        ) : (
          files.map((file) => (
            <TreeNode key={file.path} file={file} depth={0} selectedFile={selectedFile}
              onFileSelect={onFileSelect} modifiedFiles={modifiedFiles} searchQuery={searchQuery} />
          ))
        )}
      </div>
    </div>
  );
}
