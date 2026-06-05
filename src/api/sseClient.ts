/**
 * Minimal Server-Sent-Events client for React Native, over POST.
 *
 * The browser `EventSource` is GET-only and can't carry an Authorization
 * header or a request body, so it can't talk to `POST /v1/ai/chat`. This uses
 * `XMLHttpRequest` (which React Native exposes natively and delivers
 * incrementally via `responseText` at `readyState === 3`) to stream the
 * response, parse `data:` frames, and surface each event's payload.
 *
 * One-shot: a single request that streams until the server closes. No reconnect
 * (the chat turn is a single stream; a dropped connection ends the turn).
 */

export interface SsePostOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  /** Called once per SSE event with the joined `data:` payload (raw string). */
  onEvent: (data: string) => void;
  /** Transport/HTTP failure (network down, non-2xx). */
  onError: (error: Error) => void;
  /** Stream finished (server closed the connection). Always fires last. */
  onClose: () => void;
}

export interface SseHandle {
  abort: () => void;
}

export function streamSsePost(opts: SsePostOptions): SseHandle {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', opts.url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  for (const [key, value] of Object.entries(opts.headers)) {
    xhr.setRequestHeader(key, value);
  }

  let offset = 0; // how much of responseText we've already consumed
  let buffer = ''; // unparsed tail (an incomplete event)
  let settled = false; // guard so error/close fire at most once each

  // Drain complete SSE events (separated by a blank line) out of `buffer`.
  const drain = (final: boolean) => {
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      emit(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
    }
    if (final && buffer.trim().length > 0) {
      emit(buffer);
      buffer = '';
    }
  };

  const emit = (rawEvent: string) => {
    const data = rawEvent
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data.length > 0) opts.onEvent(data);
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState >= 3) {
      const text = xhr.responseText ?? '';
      if (text.length > offset) {
        buffer += text.slice(offset);
        offset = text.length;
        drain(false);
      }
    }
    if (xhr.readyState === 4) {
      drain(true);
      if (!settled && xhr.status >= 400) {
        settled = true;
        opts.onError(new Error(`HTTP ${xhr.status}`));
      }
      opts.onClose();
    }
  };

  xhr.onerror = () => {
    if (!settled) {
      settled = true;
      opts.onError(new Error('Network request failed'));
    }
  };

  xhr.send(JSON.stringify(opts.body));

  return {
    abort: () => {
      try {
        xhr.abort();
      } catch {
        // already closed
      }
    },
  };
}
