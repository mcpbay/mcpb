const ENABLE_LOGS = Boolean(Deno.env.get("ENABLE_LOGS"));
const LOGS_PATH = Deno.env.get("LOGS_FOLDER_PATH");
const LOGS_ALIAS_PATH = Deno.env.get("LOGS_ALIAS");

export enum LogType {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

function getYYYYDDMM(separator = "") {
  const date = new Date();
  return `${date.getFullYear()}${separator}${
    date.getMonth() + 1
  }${separator}${date.getDate()}`;
}

export function writeLog(line: string | object, type: LogType = LogType.INFO) {
  if (!LOGS_PATH || !ENABLE_LOGS) {
    return;
  }

  if (typeof line === "object") {
    line = `\n${JSON.stringify(line, null, 2)}`;
  }

  if (LOGS_ALIAS_PATH) {
    line = `[${LOGS_ALIAS_PATH}] ${line}`;
  }

  line = `(${type}) ${line}`;

  const logFile = `${LOGS_PATH}/${getYYYYDDMM()}.log`;
  Deno.writeTextFileSync(logFile, line + "\n", { append: true, create: true });
}
