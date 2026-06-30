"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

const TextStreamContext = createContext(null);
const PRESERVED_KEYS = new Set([
  "type",
  "provider",
  "generatedAt",
  "imageUrl",
  "url",
  "mimeType",
]);

export function TextStreamProvider({ children }) {
  const streamsRef = useRef(new Map());

  const cancelStream = useCallback((key) => {
    const stream = streamsRef.current.get(key);
    if (!stream) return;

    window.clearTimeout(stream.timer);
    stream.resolve?.(false);
    streamsRef.current.delete(key);
  }, []);

  const streamText = useCallback(
    (key, value, onUpdate, options = {}) => {
      cancelStream(key);

      const text = String(value || "");
      if (!text) {
        onUpdate("");
        return Promise.resolve(true);
      }

      const chunks = createTextChunks(text, options.chunkSize);
      const delay = options.delay ?? getAdaptiveDelay(chunks.length);

      return new Promise((resolve) => {
        let index = 0;
        let streamed = "";
        const stream = { timer: null, resolve };
        streamsRef.current.set(key, stream);

        const tick = () => {
          if (streamsRef.current.get(key) !== stream) return;

          streamed += chunks[index] || "";
          index += 1;
          onUpdate(streamed);

          if (index >= chunks.length) {
            streamsRef.current.delete(key);
            resolve(true);
            return;
          }

          stream.timer = window.setTimeout(tick, delay);
        };

        tick();
      });
    },
    [cancelStream],
  );

  const streamObject = useCallback(
    (key, value, onUpdate, options = {}) => {
      cancelStream(key);

      const source = cloneValue(value);
      const draft = createStreamingDraft(source);
      const leaves = collectStringLeaves(source);

      onUpdate(cloneValue(draft));
      if (leaves.length === 0) {
        onUpdate(source);
        return Promise.resolve(true);
      }

      const queue = leaves.flatMap((leaf) =>
        createTextChunks(leaf.value, options.chunkSize).map((chunk) => ({
          path: leaf.path,
          chunk,
        })),
      );
      const delay = options.delay ?? getAdaptiveDelay(queue.length);

      return new Promise((resolve) => {
        let index = 0;
        const stream = { timer: null, resolve };
        streamsRef.current.set(key, stream);

        const tick = () => {
          if (streamsRef.current.get(key) !== stream) return;

          const entry = queue[index];
          appendAtPath(draft, entry.path, entry.chunk);
          index += 1;
          onUpdate(cloneValue(draft));

          if (index >= queue.length) {
            streamsRef.current.delete(key);
            onUpdate(source);
            resolve(true);
            return;
          }

          stream.timer = window.setTimeout(tick, delay);
        };

        tick();
      });
    },
    [cancelStream],
  );

  useEffect(
    () => () => {
      for (const stream of streamsRef.current.values()) {
        window.clearTimeout(stream.timer);
        stream.resolve?.(false);
      }
      streamsRef.current.clear();
    },
    [],
  );

  return (
    <TextStreamContext.Provider
      value={{ cancelStream, streamObject, streamText }}
    >
      {children}
    </TextStreamContext.Provider>
  );
}

export function useTextStream() {
  const context = useContext(TextStreamContext);
  if (!context) {
    throw new Error("useTextStream must be used inside TextStreamProvider.");
  }
  return context;
}

function createTextChunks(value, requestedSize) {
  const text = String(value || "");
  const size =
    requestedSize ||
    Math.max(2, Math.min(10, Math.ceil(text.split(/\s+/).length / 45)));
  const matches = text.match(/\S+\s*/g);

  if (!matches) return [text];

  const chunks = [];
  for (let index = 0; index < matches.length; index += size) {
    chunks.push(matches.slice(index, index + size).join(""));
  }
  return chunks;
}

function getAdaptiveDelay(chunkCount) {
  if (chunkCount <= 20) return 45;
  if (chunkCount <= 80) return 25;
  return 70;
}

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function createStreamingDraft(value, key = "") {
  if (Array.isArray(value)) {
    return [];
  }
  if (!value || typeof value !== "object") {
    if (typeof value !== "string" || PRESERVED_KEYS.has(key)) return value;
    return "";
  }

  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      childKey === "metadata" || childKey === "asset"
        ? cloneValue(childValue)
        : createStreamingDraft(childValue, childKey),
    ]),
  );
}

function collectStringLeaves(value, path = [], key = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectStringLeaves(item, [...path, index]),
    );
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value && !PRESERVED_KEYS.has(key)) {
      return [{ path, value }];
    }
    return [];
  }

  return Object.entries(value).flatMap(([childKey, childValue]) => {
    if (childKey === "metadata" || childKey === "asset") return [];
    return collectStringLeaves(childValue, [...path, childKey], childKey);
  });
}

function appendAtPath(target, path, chunk) {
  const key = path.at(-1);
  const parent = path.slice(0, -1).reduce((current, segment, index) => {
    if (current[segment] == null) {
      current[segment] =
        typeof path[index + 1] === "number" ? [] : {};
    }
    return current[segment];
  }, target);

  parent[key] = `${parent[key] || ""}${chunk}`;
}
