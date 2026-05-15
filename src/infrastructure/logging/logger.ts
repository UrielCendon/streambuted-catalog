type LogMetadata = unknown;

const formatMetadata = (metadata: LogMetadata): string => {
  if (metadata instanceof Error) {
    return `${metadata.name}: ${metadata.message}`;
  }

  if (typeof metadata === "string") {
    return metadata;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
};

const writeLog = (
  stream: NodeJS.WriteStream,
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  metadata: LogMetadata[]
): void => {
  const metadataText = metadata.length > 0 ? ` ${metadata.map(formatMetadata).join(" ")}` : "";
  stream.write(`[${level}] ${message}${metadataText}\n`);
};

export const logger = {
  info(message: string, ...metadata: LogMetadata[]): void {
    writeLog(process.stdout, "INFO", message, metadata);
  },

  warn(message: string, ...metadata: LogMetadata[]): void {
    writeLog(process.stderr, "WARN", message, metadata);
  },

  error(message: string, ...metadata: LogMetadata[]): void {
    writeLog(process.stderr, "ERROR", message, metadata);
  }
};
