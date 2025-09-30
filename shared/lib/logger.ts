export type LogLevel = "log" | "info" | "warn" | "error" | "debug" | "trace";

const isDevelopment =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

function formatPrefix(level: LogLevel): string {
  const timestamp = new Date().toISOString();
  return `[DEV][${level.toUpperCase()}][${timestamp}]`;
}

function createMethod(level: LogLevel) {
  if (!isDevelopment) {
    return (..._args: unknown[]) => {};
  }
  const consoleAny = console as unknown as Record<
    LogLevel,
    (...args: unknown[]) => void
  >;
  const method: (...args: unknown[]) => void = consoleAny[level] || console.log;
  return (...args: unknown[]) => {
    method(formatPrefix(level), ...args);
  };
}

export const logger = {
  log: createMethod("log"),
  info: createMethod("info"),
  warn: createMethod("warn"),
  error: createMethod("error"),
  debug: createMethod("debug"),
  trace: createMethod("trace"),
  withScope(scope: string) {
    if (!isDevelopment) {
      return {
        log: (..._args: unknown[]) => {},
        info: (..._args: unknown[]) => {},
        warn: (..._args: unknown[]) => {},
        error: (..._args: unknown[]) => {},
        debug: (..._args: unknown[]) => {},
        trace: (..._args: unknown[]) => {},
      };
    }
    const scopePrefix = `[${scope}]`;
    return {
      log: (...args: unknown[]) => logger.log(scopePrefix, ...args),
      info: (...args: unknown[]) => logger.info(scopePrefix, ...args),
      warn: (...args: unknown[]) => logger.warn(scopePrefix, ...args),
      error: (...args: unknown[]) => logger.error(scopePrefix, ...args),
      debug: (...args: unknown[]) => logger.debug(scopePrefix, ...args),
      trace: (...args: unknown[]) => logger.trace(scopePrefix, ...args),
    };
  },
};
