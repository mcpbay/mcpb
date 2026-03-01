import { LogLevel } from "@mcpbay/easy-mcp-server/enums";

const ENABLE_LOGS = Boolean(Deno.env.get("ENABLE_LOGS"));
const LOGS_PATH = Deno.env.get("LOGS_FOLDER_PATH");
const LOGS_ALIAS = Deno.env.get("LOGS_ALIAS");

function getYYYYDDMM(separator = "") {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}${separator}${day}${separator}${month}`;
}

export function writeLog(line: string | object, type: LogLevel = LogLevel.DEBUG) {
  if (!LOGS_PATH || !ENABLE_LOGS) {
    return;
  }

  if (typeof line === "object") {
    line = `\n${JSON.stringify(line, null, 2)}`;
  }

  if (LOGS_ALIAS) {
    line = `[${LOGS_ALIAS}] ${line}`;
  }

  line = `(${type}) ${line}`;

  const logFile = `${LOGS_PATH}/${getYYYYDDMM()}.log`;
  Deno.writeTextFileSync(logFile, line + "\n", { append: true, create: true });
}
