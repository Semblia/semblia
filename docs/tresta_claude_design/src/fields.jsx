/* Form field components. All styling flows from CSS vars set by tokens. */

const { useState, useRef, useEffect } = React;

/* Shared field shell — shape and density come from tokens */
function fieldBaseStyle(tokens, { focus = false } = {}) {
  const shape = tokens.fieldShape;
  const radius = {
    rounded: tokens.radius,
    square: 0,
    underline: 0,
    pill: 999,
  }[shape];
  const density = {
    compact: { py: 10, px: 12 },
    default: { py: 14, px: 16 },
    cozy:    { py: 16, px: 18 },
    airy:    { py: 20, px: 22 },
  }[tokens.density];

  const base = {
    width: "100%",
    fontFamily: tokens.fontBody,
    fontSize: tokens.sizeBase,
    color: tokens.ink,
    background: tokens.surface,
    border: `1px solid ${tokens.line}`,
    borderRadius: radius,
    padding: `${density.py}px ${density.px}px`,
    outline: "none",
    transition: "border-color 140ms ease, box-shadow 140ms ease, background 140ms ease",
  };
  if (shape === "underline") {
    base.border = "none";
    base.borderBottom = `1.5px solid ${tokens.line}`;
    base.background = "transparent";
    base.borderRadius = 0;
    base.paddingLeft = 0;
    base.paddingRight = 0;
  }
  if (focus) {
    if (shape === "underline") base.borderBottomColor = tokens.accent;
    else {
      base.borderColor = tokens.accent;
      base.boxShadow = `0 0 0 3px ${hexWithAlpha(tokens.accent, 0.15)}`;
    }
  }
  return base;
}

function hexWithAlpha(color, a) {
  // works for hex or oklch
  if (color.startsWith("oklch")) return color.replace(")", ` / ${a})`);
  if (color.startsWith("#") && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

function FieldLabel({ children, required, tokens, onEdit }) {
  return (
    <div style={{
      fontFamily: tokens.fontBody,
      fontSize: Math.round(tokens.sizeBase * 0.95),
      fontWeight: 500,
      color: tokens.ink,
      marginBottom: 10,
      letterSpacing: "-0.005em",
      display: "flex",
      alignItems: "baseline",
      gap: 8,
    }}>
      <InlineEditable value={children} onChange={onEdit} style={{ flex: 1 }} />
      {required && <span style={{ color: tokens.accent, fontSize: Math.round(tokens.sizeBase * 0.8) }}>required</span>}
    </div>
  );
}

/* Inline editable text — click to edit */
function InlineEditable({ value, onChange, style, multiline = false, as: As = "span" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef();
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); document.execCommand?.("selectAll", false, null); } }, [editing]);

  if (!editing) {
    return (
      <As
        style={{ ...style, cursor: "text", borderRadius: 3, transition: "background 120ms" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(127,127,127,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Click to edit"
      >{value}</As>
    );
  }
  return (
    <As
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={{ ...style, outline: "none", background: "rgba(127,127,127,0.12)", borderRadius: 3 }}
      onBlur={(e) => { setEditing(false); onChange?.(e.currentTarget.textContent); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { e.currentTarget.textContent = value; e.currentTarget.blur(); }
      }}
    >{draft}</As>
  );
}

/* ─── Short text ─── */
function ShortText({ q, tokens, value, onChange, onEditLabel }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <input
        type="text"
        value={value || ""}
        placeholder={q.placeholder || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={fieldBaseStyle(tokens, { focus })}
      />
    </div>
  );
}

/* ─── Long text ─── */
function LongText({ q, tokens, value, onChange, onEditLabel }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <textarea
        rows={4}
        value={value || ""}
        placeholder={q.placeholder || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...fieldBaseStyle(tokens, { focus }), resize: "vertical", minHeight: 110, fontFamily: tokens.fontBody }}
      />
    </div>
  );
}

/* ─── Star rating ─── */
function StarRating({ q, tokens, value, onChange, onEditLabel }) {
  const v = value || 0;
  const [hover, setHover] = useState(0);
  const active = hover || v;
  const size = Math.round(tokens.sizeBase * 2.2);
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <div style={{ display: "flex", gap: 10 }} onMouseLeave={() => setHover(0)}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            style={{
              width: size, height: size,
              background: "transparent", border: "none", padding: 0, cursor: "pointer",
              color: n <= active ? tokens.accent : tokens.line,
              transition: "transform 120ms ease, color 120ms",
              transform: n <= active ? "scale(1.0)" : "scale(0.94)",
            }}
            aria-label={`${n} star${n>1?'s':''}`}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
              <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.7L6 22l1.5-7.3L2 10l7.1-1.1L12 2z"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── NPS 0-10 ─── */
function NPS({ q, tokens, value, onChange, onEditLabel }) {
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(11,1fr)", gap: 6 }}>
        {Array.from({ length: 11 }, (_, i) => {
          const on = value === i;
          const radius = { rounded: tokens.radius, square: 0, underline: 0, pill: 999 }[tokens.fieldShape];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              style={{
                height: 44,
                fontFamily: tokens.fontMono,
                fontSize: 14,
                fontWeight: 500,
                color: on ? tokens.accentInk : tokens.ink,
                background: on ? tokens.accent : "transparent",
                border: `1px solid ${on ? tokens.accent : tokens.line}`,
                borderRadius: radius,
                cursor: "pointer",
                transition: "all 120ms",
              }}
            >{i}</button>
          );
        })}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 8, fontFamily: tokens.fontMono, fontSize: 11,
        color: tokens.inkSoft, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        <span>Not likely</span><span>Very likely</span>
      </div>
    </div>
  );
}

/* ─── Emoji scale ─── */
function EmojiScale({ q, tokens, value, onChange, onEditLabel }) {
  const items = [
    { v: 1, emoji: "😞", label: "Awful" },
    { v: 2, emoji: "😕", label: "Meh" },
    { v: 3, emoji: "🙂", label: "Good" },
    { v: 4, emoji: "😄", label: "Great" },
    { v: 5, emoji: "🤩", label: "Amazing" },
  ];
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map(it => {
          const on = value === it.v;
          const radius = { rounded: tokens.radius, square: 0, underline: tokens.radius, pill: 999 }[tokens.fieldShape];
          return (
            <button
              key={it.v}
              type="button"
              onClick={() => onChange(it.v)}
              style={{
                flex: 1, minWidth: 72,
                padding: "14px 8px",
                background: on ? hexWithAlpha(tokens.accent, 0.12) : "transparent",
                border: `1px solid ${on ? tokens.accent : tokens.line}`,
                borderRadius: radius,
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                transition: "all 140ms",
                transform: on ? "translateY(-2px)" : "none",
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1, filter: on ? "none" : "grayscale(0.4)" }}>{it.emoji}</div>
              <div style={{
                fontFamily: tokens.fontMono, fontSize: 10, letterSpacing: "0.06em",
                textTransform: "uppercase", color: on ? tokens.accent : tokens.inkSoft,
              }}>{it.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Radio (multiple choice) ─── */
function Radio({ q, tokens, value, onChange, onEditLabel }) {
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(q.options || []).map((opt, i) => {
          const on = value === opt;
          const radius = { rounded: tokens.radius, square: 0, underline: tokens.radius, pill: 999 }[tokens.fieldShape];
          return (
            <label
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px",
                background: on ? hexWithAlpha(tokens.accent, 0.08) : tokens.surface,
                border: `1px solid ${on ? tokens.accent : tokens.line}`,
                borderRadius: radius,
                cursor: "pointer",
                fontFamily: tokens.fontBody,
                fontSize: tokens.sizeBase,
                color: tokens.ink,
                transition: "all 120ms",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 999,
                border: `2px solid ${on ? tokens.accent : tokens.line}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {on && <span style={{ width: 8, height: 8, borderRadius: 999, background: tokens.accent }} />}
              </span>
              <input
                type="radio"
                checked={on}
                onChange={() => onChange(opt)}
                style={{ display: "none" }}
              />
              {opt}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Checkboxes ─── */
function Checkboxes({ q, tokens, value, onChange, onEditLabel }) {
  const arr = Array.isArray(value) ? value : [];
  const toggle = (opt) => onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(q.options || []).map((opt, i) => {
          const on = arr.includes(opt);
          const radius = { rounded: tokens.radius, square: 0, underline: tokens.radius, pill: 999 }[tokens.fieldShape];
          return (
            <label
              key={i}
              onClick={() => toggle(opt)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px",
                background: on ? hexWithAlpha(tokens.accent, 0.08) : tokens.surface,
                border: `1px solid ${on ? tokens.accent : tokens.line}`,
                borderRadius: radius,
                cursor: "pointer",
                fontFamily: tokens.fontBody, fontSize: tokens.sizeBase, color: tokens.ink,
                transition: "all 120ms",
              }}
            >
              <span style={{
                width: 18, height: 18,
                border: `2px solid ${on ? tokens.accent : tokens.line}`,
                background: on ? tokens.accent : "transparent",
                borderRadius: Math.min(6, tokens.radius),
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tokens.accentInk} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </span>
              {opt}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Dropdown ─── */
function Dropdown({ q, tokens, value, onChange, onEditLabel }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            ...fieldBaseStyle(tokens, { focus }),
            appearance: "none", WebkitAppearance: "none",
            paddingRight: 40,
            cursor: "pointer",
          }}
        >
          <option value="" disabled>{q.placeholder || "Select one..."}</option>
          {(q.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.inkSoft} strokeWidth="2"
          style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
  );
}

/* ─── File upload ─── */
function FileUpload({ q, tokens, value, onChange, onEditLabel }) {
  const radius = { rounded: tokens.radius, square: 0, underline: tokens.radius, pill: 24 }[tokens.fieldShape];
  return (
    <div>
      <FieldLabel tokens={tokens} required={q.required} onEdit={onEditLabel}>{q.label}</FieldLabel>
      <label
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          padding: "28px 20px",
          border: `1.5px dashed ${tokens.line}`,
          borderRadius: radius,
          background: "transparent",
          cursor: "pointer",
          fontFamily: tokens.fontBody,
          fontSize: tokens.sizeBase,
          color: tokens.inkSoft,
          transition: "all 120ms",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = tokens.accent; e.currentTarget.style.color = tokens.ink; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = tokens.line; e.currentTarget.style.color = tokens.inkSoft; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v14M5 10l7-7 7 7M5 21h14"/>
        </svg>
        {value ? value : (q.placeholder || "Upload a photo or video")}
        <input type="file" style={{ display: "none" }} onChange={e => onChange(e.target.files?.[0]?.name || null)} />
      </label>
    </div>
  );
}

/* Dispatcher */
function Field(props) {
  switch (props.q.type) {
    case "shorttext": return <ShortText {...props} />;
    case "longtext":  return <LongText {...props} />;
    case "stars":     return <StarRating {...props} />;
    case "nps":       return <NPS {...props} />;
    case "emoji":     return <EmojiScale {...props} />;
    case "radio":     return <Radio {...props} />;
    case "checkbox":  return <Checkboxes {...props} />;
    case "dropdown":  return <Dropdown {...props} />;
    case "file":      return <FileUpload {...props} />;
    default: return null;
  }
}

/* Button */
function SubmitButton({ tokens, label, onClick, disabled, fullWidth }) {
  const radius = {
    solid: tokens.radius,
    pill: 999,
    block: 0,
    ghost: tokens.radius,
  }[tokens.buttonStyle];
  const isGhost = tokens.buttonStyle === "ghost";
  const isBlock = tokens.buttonStyle === "block";
  const shadow = {
    none: "none",
    sm: "0 1px 0 rgba(0,0,0,0.04)",
    soft: "0 8px 24px -8px rgba(0,0,0,0.15)",
    hard: `4px 4px 0 0 ${tokens.ink}`,
    glow: `0 0 0 1px ${hexWithAlpha(tokens.accent, 0.25)}, 0 12px 40px -12px ${hexWithAlpha(tokens.accent, 0.55)}`,
  }[tokens.shadow] || "none";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: tokens.fontBody,
        fontSize: Math.round(tokens.sizeBase * 1.02),
        fontWeight: 500,
        letterSpacing: isBlock ? "0.04em" : "-0.005em",
        textTransform: isBlock ? "uppercase" : "none",
        color: isGhost ? tokens.ink : tokens.accentInk,
        background: isGhost ? "transparent" : tokens.accent,
        border: isGhost ? `1.5px solid ${tokens.ink}` : (isBlock ? `2px solid ${tokens.ink}` : "none"),
        borderRadius: radius,
        padding: "16px 28px",
        width: fullWidth ? "100%" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: shadow,
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = tokens.shadow === "hard" ? "translate(-2px,-2px)" : "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
    >{label}</button>
  );
}

Object.assign(window, { Field, InlineEditable, SubmitButton, fieldBaseStyle, hexWithAlpha });
