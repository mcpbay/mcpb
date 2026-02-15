// Generated with Deepseek.
const EXTENSION_MIME_MAP: Record<string, string> = {
  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  
  // Programming languages
  ".rs": "text/x-rust",
  ".py": "text/x-python",
  ".rb": "text/x-ruby",
  ".php": "text/x-php",
  ".java": "text/x-java",
  ".go": "text/x-go",
  ".swift": "text/x-swift",
  ".kt": "text/x-kotlin",
  ".kts": "text/x-kotlin",
  ".c": "text/x-c",
  ".h": "text/x-c",
  ".cpp": "text/x-c++",
  ".hpp": "text/x-c++",
  ".cs": "text/x-csharp",
  ".fs": "text/x-fsharp",
  ".lua": "text/x-lua",
  ".pl": "text/x-perl",
  ".pm": "text/x-perl",
  ".r": "text/x-r",
  ".dart": "text/x-dart",
  ".scala": "text/x-scala",
  ".zig": "text/x-zig",
  ".hs": "text/x-haskell",
  ".ex": "text/x-elixir",
  ".exs": "text/x-elixir",
  ".erl": "text/x-erlang",
  ".hrl": "text/x-erlang",
  ".clj": "text/x-clojure",
  ".groovy": "text/x-groovy",
  ".asm": "text/x-assembly",
  ".s": "text/x-assembly",
  
  // Web & Styles
  ".html": "text/html",
  ".htm": "text/html",
  ".xhtml": "application/xhtml+xml",
  ".css": "text/css",
  ".scss": "text/x-scss",
  ".sass": "text/x-sass",
  ".less": "text/x-less",
  ".svelte": "text/html",
  ".vue": "text/html",
  ".astro": "text/html",
  ".ejs": "text/html",
  ".hbs": "text/html",
  ".handlebars": "text/html",
  ".pug": "text/x-pug",
  ".jade": "text/x-pug",
  
  // JavaScript & TypeScript
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".cjs": "application/javascript",
  ".jsx": "application/javascript",
  ".ts": "application/typescript",
  ".tsx": "application/typescript",
  ".d.ts": "application/typescript",
  
  // Docs & Text
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".rtf": "application/rtf",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".tex": "application/x-tex",
  
  // Data & Configuration
  ".json": "application/json",
  ".jsonc": "application/json",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".toml": "application/toml",
  ".ini": "text/plain",
  ".cfg": "text/plain",
  ".conf": "text/plain",
  ".props": "text/plain",
  ".properties": "text/plain",
  ".env": "text/plain",
  ".xml": "application/xml",
  ".xsd": "application/xml",
  ".xsl": "application/xml",
  ".xslt": "application/xslt+xml",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  
  // Compress & files
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".tgz": "application/gzip",
  ".bz2": "application/x-bzip2",
  ".7z": "application/x-7z-compressed",
  ".rar": "application/vnd.rar",
  ".xz": "application/x-xz",
  
  // Executables & Libs
  ".exe": "application/vnd.microsoft.portable-executable",
  ".dll": "application/x-msdownload",
  ".so": "application/x-sharedlib",
  ".dylib": "application/x-mach-binary",
  ".bin": "application/octet-stream",
  ".elf": "application/x-executable",
  ".wasm": "application/wasm",
  ".class": "application/x-java",
  ".jar": "application/java-archive",
  
  // Fonts
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wma": "audio/x-ms-wma",
  
  // Video
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".flv": "video/x-flv",
  ".wmv": "video/x-ms-wmv",
  ".m4v": "video/x-m4v",
  ".3gp": "video/3gpp",
  
  // Database
  ".sql": "application/sql",
  ".db": "application/x-sqlite3",
  ".sqlite": "application/x-sqlite3",
  ".sqlite3": "application/x-sqlite3",
  
  // Spreadsheets
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".numbers": "application/x-iwork-numbers-sffnumbers",
  
  // Presentations
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".key": "application/x-iwork-keynote-sffkey",
  
  // Other
  ".log": "text/plain",
  ".lock": "application/json",
  ".license": "text/plain",
  ".gitignore": "text/plain",
  ".dockerignore": "text/plain",
  ".editorconfig": "text/plain",
  ".eslintrc": "application/json",
  ".prettierrc": "application/json",
  ".babelrc": "application/json",
  ".npmrc": "text/plain",
  ".yarnrc": "text/plain"
};

export function fileNameToMime(fileName: string) {
  for (const extension in EXTENSION_MIME_MAP) {
    if (fileName.endsWith(extension)) {
      return EXTENSION_MIME_MAP[extension];
    }
  }

  return "application/octet-stream";
}