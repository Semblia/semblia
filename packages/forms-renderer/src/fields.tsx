import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { FormField, RatingStyle } from "@workspace/forms-core";

export interface FieldControlProps {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  /** Called after a value is picked on a control that can trigger auto-advance. */
  onCommit?: () => void;
  /** Registers the actual File objects behind an upload/capture answer. */
  onFiles?: (files: File[]) => void;
  autoFocus?: boolean;
}

const asText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

function FieldShell({
  field,
  error,
  children,
  stepped,
}: {
  field: FormField;
  error?: string;
  children: ReactNode;
  stepped?: boolean;
}) {
  const helpId = field.description ? `${field.id}-help` : undefined;
  const errId = error ? `${field.id}-err` : undefined;
  return (
    <div
      className={`tf-field${stepped ? " tf-step-field" : ""}`}
      data-tf-field={field.id}
    >
      <label className="tf-label" htmlFor={field.id}>
        {field.label}
        {field.required ? <span className="tf-required" aria-hidden="true">*</span> : null}
      </label>
      {field.description ? (
        <p className="tf-help" id={helpId}>
          {field.description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="tf-error" id={errId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(field: FormField, error?: string): string | undefined {
  const ids = [
    field.description ? `${field.id}-help` : null,
    error ? `${field.id}-err` : null,
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

const RATING_GLYPH: Record<RatingStyle, (active: boolean) => string> = {
  stars: (a) => (a ? "★" : "☆"),
  hearts: (a) => (a ? "♥" : "♡"),
  emoji: () => "🙂",
  numbers: (_a) => "",
};

function RatingControl({ field, value, error, onChange, onCommit }: FieldControlProps) {
  const scale = field.ratingScale ?? 5;
  const style: RatingStyle = field.ratingStyle ?? "stars";
  const current = Number(value) || 0;
  return (
    <div
      className="tf-rating"
      data-style={style}
      role="radiogroup"
      aria-label={field.label}
      aria-describedby={describedBy(field, error)}
    >
      {Array.from({ length: scale }, (_, i) => i + 1).map((n) => {
        const active = n <= current;
        const label = style === "numbers" ? String(n) : RATING_GLYPH[style](active);
        return (
          <button
            key={n}
            type="button"
            className="tf-rating-btn"
            role="radio"
            aria-checked={current === n}
            aria-pressed={active}
            aria-label={`${n} of ${scale}`}
            onClick={() => {
              onChange(n);
              onCommit?.();
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SingleSelectControl({ field, value, error, onChange }: FieldControlProps) {
  const options = field.options ?? [];
  return (
    <div className="tf-options" role="radiogroup" aria-label={field.label} aria-describedby={describedBy(field, error)}>
      {options.map((opt) => (
        <label key={opt.value} className="tf-option" data-selected={value === opt.value}>
          <input
            type="radio"
            name={field.id}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function MultiSelectControl({ field, value, error, onChange }: FieldControlProps) {
  const options = field.options ?? [];
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const atMax = field.maxSelections != null && selected.length >= field.maxSelections;
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else if (!atMax) onChange([...selected, v]);
  };
  return (
    <div className="tf-options" role="group" aria-label={field.label} aria-describedby={describedBy(field, error)}>
      {options.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <label key={opt.value} className="tf-option" data-selected={isOn}>
            <input
              type="checkbox"
              value={opt.value}
              checked={isOn}
              disabled={!isOn && atMax}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function ConsentControl({ field, value, error, onChange }: FieldControlProps) {
  const errId = error ? `${field.id}-err` : undefined;
  return (
    <div className="tf-field" data-tf-field={field.id}>
      <label className="tf-consent" htmlFor={field.id}>
        <input
          id={field.id}
          type="checkbox"
          checked={value === true || value === "true"}
          aria-describedby={errId}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {field.consentCopy || field.label}
          {field.required ? <span className="tf-required" aria-hidden="true">*</span> : null}
        </span>
      </label>
      {error ? (
        <p className="tf-error" id={errId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function UploadControl({ field, value, error, onChange, onFiles }: FieldControlProps) {
  const multiple = (field.maxFileCount ?? 1) > 1;
  const accept = field.fileTypes?.join(",");
  const name = typeof value === "string" ? value : "";
  return (
    <label className="tf-upload" htmlFor={field.id}>
      <input
        id={field.id}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        aria-describedby={describedBy(field, error)}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          onFiles?.(files);
          onChange(multiple ? files.map((f) => f.name) : (files[0]?.name ?? ""));
        }}
      />
      <span>{name || (field.type === "imageUpload" ? "Upload an image" : "Upload a file")}</span>
    </label>
  );
}

function formatDuration(sec: number): string {
  if (sec % 60 === 0) return `${sec / 60} min`;
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

/** Best supported MediaRecorder mime for the kind, with its file extension. */
function pickRecordingFormat(isVideo: boolean): { mime: string; ext: string } {
  const candidates = isVideo
    ? [
        { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
        { mime: "video/webm", ext: "webm" },
        { mime: "video/mp4", ext: "mp4" },
      ]
    : [
        { mime: "audio/webm;codecs=opus", ext: "webm" },
        { mime: "audio/webm", ext: "webm" },
        { mime: "audio/mp4", ext: "m4a" },
      ];
  for (const candidate of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(candidate.mime)
    ) {
      return candidate;
    }
  }
  return candidates[1]!;
}

type RecorderPhase = "idle" | "arming" | "recording" | "denied";

/**
 * The in-browser recorder behind video/audio asks: getUserMedia + a
 * MediaRecorder with a live preview, a duration cap, and playback of the
 * take before it's attached. Pure client machinery — SSR renders the idle
 * shell and nothing touches media APIs until the respondent asks to record.
 */
function useMediaRecorder({
  isVideo,
  maxDurationSec,
  onRecorded,
}: {
  isVideo: boolean;
  maxDurationSec?: number;
  onRecorded: (file: File) => void;
}) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const teardown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPhase("denied");
      return;
    }
    setPhase("arming");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        isVideo
          ? { video: { facingMode: "user" }, audio: true }
          : { audio: true },
      );
      streamRef.current = stream;
      const format = pickRecordingFormat(isVideo);
      const recorder = new MediaRecorder(stream, { mimeType: format.mime });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: format.mime.split(";")[0],
        });
        teardown();
        setPhase("idle");
        setElapsed(0);
        if (blob.size > 0) {
          onRecorded(
            new File([blob], `recording-${Date.now()}.${format.ext}`, {
              type: blob.type,
            }),
          );
        }
      };
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        void previewRef.current.play().catch(() => undefined);
      }
      recorder.start();
      setElapsed(0);
      setPhase("recording");
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(seconds);
        if (maxDurationSec && seconds >= maxDurationSec) stop();
      }, 250);
    } catch {
      teardown();
      setPhase("denied");
    }
  }, [isVideo, maxDurationSec, onRecorded, stop, teardown]);

  return { phase, elapsed, previewRef, start, stop };
}

/**
 * Video/audio capture: a native in-browser recorder (getUserMedia +
 * MediaRecorder — live preview, duration cap, playback of the take) with an
 * upload fallback beside it. The take becomes a File on the submit payload;
 * the host uploads the bytes and rewrites the answer to the asset id.
 */
function MediaCaptureControl({ field, value, error, onChange, onFiles }: FieldControlProps) {
  const isVideo = field.type === "videoUpload";
  const accept = field.fileTypes?.join(",") ?? (isVideo ? "video/*" : "audio/*");
  const name = typeof value === "string" ? value : "";
  const cap = field.maxDurationSec;
  const [takeUrl, setTakeUrl] = useState<string | null>(null);

  // Revoke the previous take's object URL when replaced or unmounted.
  useEffect(
    () => () => {
      if (takeUrl) URL.revokeObjectURL(takeUrl);
    },
    [takeUrl],
  );

  const attach = useCallback(
    (file: File, previewUrl: string | null) => {
      setTakeUrl(previewUrl);
      onFiles?.([file]);
      onChange(file.name);
    },
    [onChange, onFiles],
  );

  const { phase, elapsed, previewRef, start, stop } = useMediaRecorder({
    isVideo,
    maxDurationSec: cap,
    onRecorded: (file) => attach(file, URL.createObjectURL(file)),
  });

  const recording = phase === "recording" || phase === "arming";

  return (
    <div className="tf-capture" data-kind={isVideo ? "video" : "audio"}>
      {isVideo && (
        <div className="tf-rec-stage" data-active={recording || !!takeUrl}>
          {recording ? (
            <video ref={previewRef} className="tf-rec-live" muted playsInline />
          ) : takeUrl ? (
            <video className="tf-rec-play" src={takeUrl} controls playsInline />
          ) : null}
        </div>
      )}
      {!isVideo && takeUrl && !recording ? (
        <audio className="tf-rec-audio" src={takeUrl} controls />
      ) : null}

      <div className="tf-capture-row">
        {recording ? (
          <button type="button" className="tf-capture-btn" data-recording onClick={stop}>
            <span className="tf-capture-dot" aria-hidden="true" />
            <span className="tf-capture-label">
              {phase === "arming"
                ? "Starting…"
                : `Stop · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}
            </span>
          </button>
        ) : (
          <button type="button" className="tf-capture-btn" onClick={() => void start()}>
            <span className="tf-capture-dot" aria-hidden="true" />
            <span className="tf-capture-label">
              {name ? "Record again" : isVideo ? "Record a video" : "Record audio"}
            </span>
          </button>
        )}

        <label className="tf-capture-upload" htmlFor={field.id}>
          <input
            id={field.id}
            type="file"
            accept={accept}
            style={{ display: "none" }}
            aria-describedby={describedBy(field, error)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              attach(file, URL.createObjectURL(file));
            }}
          />
          or upload {isVideo ? "a video" : "audio"}
        </label>
      </div>

      {phase === "denied" ? (
        <p className="tf-capture-hint" role="status">
          Couldn&apos;t access your {isVideo ? "camera" : "microphone"} — you
          can upload a file instead.
        </p>
      ) : name && !recording ? (
        <p className="tf-capture-file" role="status">
          {name} — attached
        </p>
      ) : cap ? (
        <p className="tf-capture-hint">Up to {formatDuration(cap)}.</p>
      ) : null}
    </div>
  );
}

function TextControl({ field, value, error, onChange }: FieldControlProps) {
  const common = {
    id: field.id,
    value: asText(value),
    placeholder: field.placeholder,
    required: field.required,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy(field, error),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };
  if (field.type === "longText") {
    return <textarea className="tf-textarea" maxLength={field.maxLength} {...common} />;
  }
  const inputType =
    field.type === "email" ? "email" : field.type === "website" ? "url" : "text";
  return (
    <input
      className="tf-input"
      type={inputType}
      inputMode={field.type === "email" ? "email" : undefined}
      maxLength={field.maxLength}
      {...common}
    />
  );
}

/** Render one field's control, dispatching on type. Hidden fields render nothing. */
export function FieldControl(props: FieldControlProps) {
  const { field } = props;
  switch (field.type) {
    case "hidden":
      return null;
    case "consent":
      return <ConsentControl {...props} />;
    case "rating":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <RatingControl {...props} />
        </FieldShell>
      );
    case "singleSelect":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <SingleSelectControl {...props} />
        </FieldShell>
      );
    case "multiSelect":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <MultiSelectControl {...props} />
        </FieldShell>
      );
    case "imageUpload":
    case "fileUpload":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <UploadControl {...props} />
        </FieldShell>
      );
    case "videoUpload":
    case "audioUpload":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <MediaCaptureControl {...props} />
        </FieldShell>
      );
    default:
      return (
        <FieldShell field={field} error={props.error} stepped>
          <TextControl {...props} />
        </FieldShell>
      );
  }
}
