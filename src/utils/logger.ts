import { config } from '@config/index';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

interface LogTransport {
  log(level: LogLevel, scope: string, message: string, meta?: unknown): void;
}

/**
 * Default transport: pretty-prints to the JS console with a [scope] prefix.
 * Stripped at build time in release configs by Babel's removeConsole plugin.
 */
const consoleTransport: LogTransport = {
  log(level, scope, message, meta) {
    const tag = `[MyEK · ${scope}]`;
    const args: unknown[] = meta !== undefined ? [tag, message, meta] : [tag, message];
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(...args);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(...args);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(...args);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(...args);
        break;
    }
  },
};

/**
 * Stub for a remote transport. In production this would batch-upload to
 * Application Insights / Splunk / Datadog over HTTPS, with PII scrubbing.
 */
const remoteTransport: LogTransport = {
  log() {
    // intentional no-op stub
  },
};

class Logger {
  constructor(
    private readonly scope: string,
    private readonly transports: LogTransport[],
    private readonly minLevel: LogLevel,
  ) {}

  private emit(level: LogLevel, message: string, meta?: unknown) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    for (const t of this.transports) t.log(level, this.scope, message, meta);
  }

  debug = (msg: string, meta?: unknown) => this.emit('debug', msg, meta);
  info = (msg: string, meta?: unknown) => this.emit('info', msg, meta);
  warn = (msg: string, meta?: unknown) => this.emit('warn', msg, meta);
  error = (msg: string, meta?: unknown) => this.emit('error', msg, meta);

  /** Branch a child logger with a nested scope, e.g. logger.child('Auth') */
  child(subScope: string) {
    return new Logger(`${this.scope}/${subScope}`, this.transports, this.minLevel);
  }
}

const transports: LogTransport[] = [consoleTransport];
if (config.log.remoteEnabled) transports.push(remoteTransport);

export const createLogger = (scope: string) => new Logger(scope, transports, config.log.level);

/** Convenience root logger. Prefer `createLogger('MyModule')` per module. */
export const logger = createLogger('App');
