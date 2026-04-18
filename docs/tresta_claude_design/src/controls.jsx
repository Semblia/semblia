/* Controls panel — live-tweak everything.
   Now with composable layout config, community presets, and conditional logic. */

const { useState: useS_C } = React;

/* ── Primitive atoms ── */
function Row({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: '"Geist Mono", ui-monospace, monospace',
        fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#6b6b67", marginBottom: 8,
        display: "flex", justifyContent: "space-between",
      }}>
        <span>{label}</span>
        {hint != null && <span style={{ color: "#111110", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children, defaultOpen = true, tag }) {
  const [open, setOpen] = useS_C(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid #d9d5c9", padding: "18px 20px" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "transparent", border: "none", padding: 0, cursor: "pointer",
        fontFamily: '"Geist", sans-serif', fontSize: 13, fontWeight: 600, color: "#111110",
        letterSpacing: "-0.005em", marginBottom: open ? 14 : 0,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {title}
          {tag && <span style={{
            fontFamily: '"Geist Mono"', fontSize: 9, fontWeight: 500,
            padding: "2px 6px", background: "#111110", color: "#faf8f2",
            borderRadius: 3, letterSpacing: "0.06em",
          }}>{tag}</span>}
        </span>
        <span style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 180ms", fontFamily: '"Geist Mono"', fontSize: 10, color: "#6b6b67" }}>▸</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function TextInput({ value, onChange, ...rest }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} {...rest}
      style={{
        width: "100%", padding: "8px 10px",
        fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: 12, color: "#111110",
        background: "#fff", border: "1px solid #d9d5c9", borderRadius: 6, outline: "none",
        ...(rest.style || {}),
      }}
      onFocus={e => (e.target.style.borderColor = "#111110")}
      onBlur={e => (e.target.style.borderColor = "#d9d5c9")} />
  );
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#111110" }}/>
      <div style={{ minWidth: 52, textAlign: "right",
        fontFamily: '"Geist Mono"', fontSize: 11, color: "#111110" }}>{value}{suffix || ""}</div>
    </div>
  );
}

function ColorInput({ value, onChange }) {
  const isHex = typeof value === "string" && value.startsWith("#");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ width: 32, height: 32, borderRadius: 6, background: value,
        border: "1px solid #d9d5c9", cursor: "pointer", flexShrink: 0,
        position: "relative", overflow: "hidden" }}>
        {isHex && <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />}
      </label>
      <TextInput value={value} onChange={onChange} />
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 10px",
        fontFamily: '"Geist Mono"', fontSize: 12, color: "#111110",
        background: "#fff", border: "1px solid #d9d5c9", borderRadius: 6,
        outline: "none", cursor: "pointer" }}>
      {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

function Pills({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "#ede9dd", padding: 3, borderRadius: 7 }}>
      {options.map(o => {
        const v = o.v ?? o;
        const label = o.label ?? o;
        const on = value === v;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            style={{ flex: 1, minWidth: 0, padding: "7px 10px",
              fontFamily: '"Geist"', fontSize: 11.5, fontWeight: 500,
              color: on ? "#fff" : "#3a3a38",
              background: on ? "#111110" : "transparent",
              border: "none", borderRadius: 5, cursor: "pointer",
              transition: "background 120ms, color 120ms", whiteSpace: "nowrap" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Main panel ── */
function ControlsPanel(props) {
  const {
    tokens, setToken, setTokens,
    preset, setPreset,
    layoutPreset, applyLayoutPreset,
    config, setConfig,
    questions, setQuestions,
    device, setDevice,
    onRandomize, onReset,
  } = props;

  const updateQ = (id, patch) =>
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  const removeQ = (id) => setQuestions(qs => qs.filter(q => q.id !== id));
  const addQ = (type) => {
    const id = "q" + Date.now();
    const defaults = {
      shorttext: { label: "Short question", placeholder: "", required: false },
      longtext:  { label: "Paragraph", placeholder: "Tell us more...", required: false },
      stars:     { label: "Rate this", required: false },
      nps:       { label: "How likely are you to recommend us?", required: false },
      emoji:     { label: "How do you feel?", required: false },
      radio:     { label: "Pick one", options: ["Option A", "Option B", "Option C"], required: false },
      checkbox:  { label: "Pick any", options: ["Option A", "Option B", "Option C"], required: false },
      dropdown:  { label: "Choose one", options: ["Option A", "Option B"], required: false },
      file:      { label: "Upload a file", placeholder: "Drop a file here", required: false },
    }[type] || { label: "Question" };
    setQuestions(qs => [...qs, { id, type, ...defaults }]);
  };
  const moveQ = (id, dir) => {
    setQuestions(qs => {
      const i = qs.findIndex(q => q.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };
  const updateConfig = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  return (
    <div className="scroll" style={{
      width: 380, flexShrink: 0, background: "#f7f5ef",
      borderRight: "1px solid #d9d5c9",
      overflowY: "auto", height: "100vh",
      fontFamily: '"Geist", sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 18px", borderBottom: "1px solid #d9d5c9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5,
            background: "#111110", color: "#faf8f2", fontFamily: '"Geist Mono"', fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center" }}>T</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111110", letterSpacing: "-0.01em" }}>Tresta Studio</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: '"Geist Mono"', fontSize: 10, color: "#6b6b67", letterSpacing: "0.08em" }}>v0.5</div>
        </div>
        <div style={{ fontSize: 12, color: "#6b6b67", lineHeight: 1.5 }}>
          Composable testimonial form.<br/>Mix layouts, tweak tokens, wire up conditional logic.
        </div>
      </div>

      {/* Device toggle + actions */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #d9d5c9" }}>
        <div style={{ display: "flex", gap: 4, background: "#ede9dd", padding: 3, borderRadius: 7, marginBottom: 10 }}>
          {[
            { v: "desktop", label: "Desktop", icon: <rect x="2" y="4" width="20" height="14" rx="2"/> },
            { v: "tablet",  label: "Tablet",  icon: <rect x="4" y="2" width="16" height="20" rx="2"/> },
            { v: "mobile",  label: "Mobile",  icon: <><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></> },
          ].map(d => {
            const on = device === d.v;
            return (
              <button key={d.v} type="button" onClick={() => setDevice(d.v)}
                style={{ flex: 1, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontFamily: '"Geist"', fontSize: 11.5, fontWeight: 500,
                  color: on ? "#fff" : "#3a3a38", background: on ? "#111110" : "transparent",
                  border: "none", borderRadius: 5, cursor: "pointer",
                  transition: "all 120ms" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{d.icon}</svg>
                {d.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onRandomize} style={quickBtn("solid")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 3v5h-5M3 21v-5h5M21 3l-7 7M3 21l7-7"/>
            </svg>
            Remix
          </button>
          <button type="button" onClick={onReset} style={quickBtn("ghost")}>Reset</button>
        </div>
      </div>

      {/* Layout preset */}
      <Section title="Layout">
        <Row label="Preset">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.entries(LAYOUT_PRESETS).map(([k, l]) => {
              const on = layoutPreset === k;
              return (
                <button key={k} type="button" onClick={() => applyLayoutPreset(k)}
                  style={{ padding: "10px 12px", borderRadius: 7,
                    border: on ? "1.5px solid #111110" : "1px solid #d9d5c9",
                    background: on ? "#fff" : "transparent",
                    cursor: "pointer", textAlign: "left" }}>
                  <LayoutThumbnail kind={k} selected={on} />
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111110", marginTop: 8 }}>{l.label}</div>
                  <div style={{ fontSize: 10, color: "#6b6b67", marginTop: 2, lineHeight: 1.3 }}>{l.sub}</div>
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Flow">
          <Pills value={config.flow} onChange={v => updateConfig("flow", v)}
            options={[
              {v:"all", label:"All"}, {v:"stepped", label:"Steps"},
              {v:"cards", label:"Cards"}, {v:"conversational", label:"Chat"},
            ]} />
        </Row>
        <Row label="Container">
          <Pills value={config.container} onChange={v => updateConfig("container", v)}
            options={[
              {v:"boxed", label:"Boxed"}, {v:"centered", label:"Centered"},
              {v:"fullbleed", label:"Full bleed"}, {v:"split", label:"Split"},
            ]} />
        </Row>
        <Row label="Hero">
          <Pills value={config.hero} onChange={v => updateConfig("hero", v)}
            options={[
              {v:"none", label:"None"}, {v:"top", label:"Top"},
              {v:"floating", label:"Float"}, {v:"side", label:"Side"},
            ]} />
        </Row>
        <Row label="Mobile override" hint={device === "mobile" ? "previewing" : ""}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Select value={config.mobileFlow} onChange={v => updateConfig("mobileFlow", v)}
              options={[
                { v: "auto", label: "Flow: inherit from desktop" },
                { v: "all", label: "Flow: all at once" },
                { v: "stepped", label: "Flow: stepped" },
                { v: "cards", label: "Flow: cards" },
                { v: "conversational", label: "Flow: conversational" },
              ]} />
            <Select value={config.mobileContainer} onChange={v => updateConfig("mobileContainer", v)}
              options={[
                { v: "auto", label: "Container: inherit" },
                { v: "boxed", label: "Container: boxed" },
                { v: "centered", label: "Container: centered" },
                { v: "fullbleed", label: "Container: full bleed" },
              ]} />
          </div>
        </Row>
        <Row label="Extras">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <ToggleRow label="Sticky progress bar" value={config.stickyProgress} onChange={v => updateConfig("stickyProgress", v)} />
            <ToggleRow label="Show brand header" value={config.showBrandPill} onChange={v => updateConfig("showBrandPill", v)} />
          </div>
        </Row>
      </Section>

      {/* House presets */}
      <Section title="House styles">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(PRESETS).map(([k, p]) => (
            <PresetCard key={k} k={k} p={p} selected={preset === k} onClick={() => setPreset(k)} />
          ))}
        </div>
      </Section>

      {/* Community gallery */}
      <Section title="Community" tag="NEW">
        <div style={{ fontSize: 11, color: "#6b6b67", marginBottom: 10, lineHeight: 1.5 }}>
          Browse presets shared by the Tresta community. Tap any to apply.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(COMMUNITY_PRESETS).map(([k, p]) => (
            <PresetCard key={k} k={k} p={p} selected={preset === k} onClick={() => setPreset(k)} showAuthor />
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" defaultOpen={false}>
        <Row label="Headline font">
          <Select value={tokens.fontHead} onChange={v => setToken("fontHead", v)}
            options={FONT_CHOICES.map(f => ({ v: f.v, label: f.label }))} />
        </Row>
        <Row label="Body font">
          <Select value={tokens.fontBody} onChange={v => setToken("fontBody", v)}
            options={FONT_CHOICES.map(f => ({ v: f.v, label: f.label }))} />
        </Row>
        <Row label="Headline size" hint={`${tokens.sizeHead}px`}>
          <NumberInput value={tokens.sizeHead} onChange={v => setToken("sizeHead", v)} min={24} max={96} />
        </Row>
        <Row label="Body size" hint={`${tokens.sizeBase}px`}>
          <NumberInput value={tokens.sizeBase} onChange={v => setToken("sizeBase", v)} min={12} max={22} />
        </Row>
        <Row label="Headline weight" hint={tokens.weightHead}>
          <NumberInput value={tokens.weightHead} onChange={v => setToken("weightHead", v)} min={300} max={900} step={50} />
        </Row>
        <Row label="Headline tracking" hint={tokens.trackingHead.toFixed(3) + "em"}>
          <NumberInput value={tokens.trackingHead} onChange={v => setToken("trackingHead", v)} min={-0.08} max={0.1} step={0.005} />
        </Row>
      </Section>

      {/* Color */}
      <Section title="Color" defaultOpen={false}>
        <Row label="Background"><ColorInput value={tokens.bg} onChange={v => setToken("bg", v)} /></Row>
        <Row label="Surface"><ColorInput value={tokens.surface} onChange={v => setToken("surface", v)} /></Row>
        <Row label="Ink"><ColorInput value={tokens.ink} onChange={v => setToken("ink", v)} /></Row>
        <Row label="Ink — soft"><ColorInput value={tokens.inkSoft} onChange={v => setToken("inkSoft", v)} /></Row>
        <Row label="Line"><ColorInput value={tokens.line} onChange={v => setToken("line", v)} /></Row>
        <Row label="Accent"><ColorInput value={tokens.accent} onChange={v => setToken("accent", v)} /></Row>
        <Row label="Accent ink"><ColorInput value={tokens.accentInk} onChange={v => setToken("accentInk", v)} /></Row>
      </Section>

      {/* Shape & density */}
      <Section title="Shape & density" defaultOpen={false}>
        <Row label="Field shape">
          <Pills value={tokens.fieldShape} onChange={v => setToken("fieldShape", v)}
            options={[{v:"rounded",label:"Round"},{v:"square",label:"Square"},{v:"underline",label:"Line"},{v:"pill",label:"Pill"}]} />
        </Row>
        <Row label="Corner radius" hint={`${tokens.radius}px`}>
          <NumberInput value={tokens.radius} onChange={v => setToken("radius", v)} min={0} max={32} />
        </Row>
        <Row label="Density">
          <Pills value={tokens.density} onChange={v => setToken("density", v)}
            options={[{v:"compact",label:"Tight"},{v:"default",label:"Default"},{v:"cozy",label:"Cozy"},{v:"airy",label:"Airy"}]} />
        </Row>
        <Row label="Button style">
          <Pills value={tokens.buttonStyle} onChange={v => setToken("buttonStyle", v)}
            options={[{v:"solid",label:"Solid"},{v:"pill",label:"Pill"},{v:"block",label:"Block"},{v:"ghost",label:"Ghost"}]} />
        </Row>
        <Row label="Shadow">
          <Pills value={tokens.shadow} onChange={v => setToken("shadow", v)}
            options={[{v:"none",label:"None"},{v:"soft",label:"Soft"},{v:"hard",label:"Hard"},{v:"glow",label:"Glow"}]} />
        </Row>
        <Row label="Background texture">
          <Pills value={tokens.texture} onChange={v => setToken("texture", v)}
            options={[{v:"none",label:"None"},{v:"grain",label:"Grain"},{v:"dots",label:"Dots"},{v:"lines",label:"Lines"}]} />
        </Row>
      </Section>

      {/* Questions + logic */}
      <Section title="Questions & logic" tag="NEW">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {questions.map((q, i) => (
            <QuestionRow key={q.id} q={q} index={i} total={questions.length} questions={questions}
              onUpdate={(patch) => updateQ(q.id, patch)}
              onRemove={() => removeQ(q.id)}
              onMove={(d) => moveQ(q.id, d)} />
          ))}
        </div>
        <AddQuestion onAdd={addQ} />
      </Section>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 10px", background: "#fff", border: "1px solid #d9d5c9", borderRadius: 6,
      fontFamily: '"Geist"', fontSize: 11.5, color: "#111110", cursor: "pointer",
    }}>
      {label}
      <span style={{
        width: 28, height: 16, borderRadius: 999,
        background: value ? "#111110" : "#c6c4bc",
        position: "relative", transition: "background 120ms",
        flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 2, left: value ? 14 : 2,
          width: 12, height: 12, borderRadius: 999, background: "#fff",
          transition: "left 140ms",
        }}/>
      </span>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ display: "none" }} />
    </label>
  );
}

function PresetCard({ k, p, selected, onClick, showAuthor }) {
  return (
    <button type="button" onClick={onClick}
      style={{ textAlign: "left", padding: "10px 12px", borderRadius: 7,
        border: selected ? "1.5px solid #111110" : "1px solid #d9d5c9",
        background: selected ? "#fff" : "transparent",
        cursor: "pointer", transition: "all 140ms", position: "relative" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.bg, border: "1px solid rgba(0,0,0,0.08)" }}/>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.surface, border: "1px solid rgba(0,0,0,0.08)" }}/>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.ink }}/>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.accent }}/>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111110", letterSpacing: "-0.005em" }}>{p.label}</div>
      <div style={{ fontSize: 10.5, color: "#6b6b67", marginTop: 2, lineHeight: 1.3 }}>{p.sub}</div>
      {showAuthor && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8,
          fontFamily: '"Geist Mono"', fontSize: 9.5, color: "#8d8b83", letterSpacing: "0.04em" }}>
          <span>{p.author}</span>
          <span>♥ {p.likes?.toLocaleString()}</span>
        </div>
      )}
    </button>
  );
}

function QuestionRow({ q, index, total, questions, onUpdate, onRemove, onMove }) {
  const [open, setOpen] = useS_C(false);
  const typeLabels = {
    shorttext: "Short text", longtext: "Paragraph", stars: "★ Stars",
    nps: "NPS 0–10", emoji: "Emoji scale", radio: "Radio",
    checkbox: "Checkboxes", dropdown: "Dropdown", file: "File upload",
  };
  const hasLogic = !!q.showIf;
  const otherQs = questions.filter(x => x.id !== q.id);

  return (
    <div style={{ border: "1px solid #d9d5c9", borderRadius: 6, background: "#fff", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: 8 }}>
        <div style={{ fontFamily: '"Geist Mono"', fontSize: 10.5, color: "#6b6b67", minWidth: 18 }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, fontSize: 12, color: "#111110",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {q.label}
          <div style={{ fontFamily: '"Geist Mono"', fontSize: 10, color: "#6b6b67", marginTop: 1,
            display: "flex", gap: 6, alignItems: "center" }}>
            {typeLabels[q.type]}
            {hasLogic && <span style={{ padding: "1px 5px", background: "#fef2e8", color: "#a63f1a",
              borderRadius: 3, fontSize: 9, letterSpacing: "0.04em" }}>IF</span>}
          </div>
        </div>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} style={iconBtn(index === 0)}>↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} style={iconBtn(index === total - 1)}>↓</button>
        <button type="button" onClick={() => setOpen(!open)} style={iconBtn(false)}>{open ? "✕" : "✎"}</button>
      </div>
      {open && (
        <div style={{ padding: "10px 10px 12px", borderTop: "1px solid #eae6d8", background: "#faf8f2" }}>
          <Row label="Label">
            <TextInput value={q.label} onChange={v => onUpdate({ label: v })} />
          </Row>
          {(q.type === "shorttext" || q.type === "longtext" || q.type === "file") && (
            <Row label="Placeholder">
              <TextInput value={q.placeholder || ""} onChange={v => onUpdate({ placeholder: v })} />
            </Row>
          )}
          {(q.type === "radio" || q.type === "checkbox" || q.type === "dropdown") && (
            <Row label="Options (one per line)">
              <textarea value={(q.options || []).join("\n")}
                onChange={e => onUpdate({ options: e.target.value.split("\n").filter(x => x.trim()) })}
                rows={4}
                style={{ width: "100%", padding: "8px 10px",
                  fontFamily: '"Geist Mono"', fontSize: 12,
                  background: "#fff", border: "1px solid #d9d5c9", borderRadius: 6,
                  outline: "none", resize: "vertical" }} />
            </Row>
          )}

          {/* Conditional logic */}
          <ConditionalLogicEditor q={q} otherQs={otherQs} onUpdate={onUpdate} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#3a3a38", cursor: "pointer" }}>
              <input type="checkbox" checked={!!q.required} onChange={e => onUpdate({ required: e.target.checked })} />
              Required
            </label>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onRemove} style={{
              fontSize: 11, color: "#d7411f", background: "transparent",
              border: "1px solid #f2caba", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionalLogicEditor({ q, otherQs, onUpdate }) {
  const has = !!q.showIf;
  const [enabled, setEnabled] = useS_C(has);
  const s = q.showIf || { questionId: otherQs[0]?.id, op: "eq", value: "" };

  const opsByType = {
    stars:    [["eq","= exactly"],["gte","≥ at least"],["lte","≤ at most"],["gt","> more than"],["lt","< less than"]],
    nps:      [["eq","= exactly"],["gte","≥ at least"],["lte","≤ at most"]],
    emoji:    [["eq","= exactly"],["gte","≥ at least"],["lte","≤ at most"]],
    radio:    [["eq","is"],["neq","is not"]],
    dropdown: [["eq","is"],["neq","is not"]],
    checkbox: [["includes","includes"]],
    shorttext:[["eq","is"],["neq","is not"],["includes","contains"]],
    longtext: [["includes","contains"]],
    file:     [["eq","is set"]],
  };
  const refQ = otherQs.find(x => x.id === s.questionId);
  const ops = refQ ? opsByType[refQ.type] || [["eq","is"]] : [["eq","is"]];

  const toggle = () => {
    if (enabled) { setEnabled(false); onUpdate({ showIf: null }); }
    else if (otherQs.length) {
      setEnabled(true);
      onUpdate({ showIf: { questionId: otherQs[0].id, op: opsByType[otherQs[0].type]?.[0]?.[0] || "eq", value: "" } });
    }
  };

  return (
    <div style={{
      marginTop: 12, padding: 10, background: "#fff",
      border: "1px solid #e3dfd2", borderRadius: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: '"Geist Mono"', fontSize: 9.5, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "#6b6b67" }}>Conditional logic</span>
          {enabled && <span style={{ padding: "1px 5px", background: "#fef2e8", color: "#a63f1a",
            borderRadius: 3, fontFamily: '"Geist Mono"', fontSize: 9, letterSpacing: "0.04em" }}>ON</span>}
        </div>
        <button type="button" onClick={toggle} disabled={!otherQs.length}
          style={{ fontFamily: '"Geist"', fontSize: 11, fontWeight: 500,
            color: enabled ? "#d7411f" : "#111110", background: "transparent",
            border: "1px solid " + (enabled ? "#f2caba" : "#d9d5c9"),
            borderRadius: 5, padding: "3px 8px", cursor: otherQs.length ? "pointer" : "not-allowed",
            opacity: otherQs.length ? 1 : 0.5 }}>
          {enabled ? "Remove" : "+ Add rule"}
        </button>
      </div>
      {enabled && (
        <>
          <div style={{ fontSize: 11, color: "#3a3a38", marginBottom: 8 }}>
            Show this only when…
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <Select value={s.questionId} onChange={v => {
              const nq = otherQs.find(x => x.id === v);
              const nop = opsByType[nq?.type]?.[0]?.[0] || "eq";
              onUpdate({ showIf: { ...s, questionId: v, op: nop, value: "" } });
            }}
              options={otherQs.map(x => ({ v: x.id, label: x.label.slice(0, 30) }))} />
            <Select value={s.op} onChange={v => onUpdate({ showIf: { ...s, op: v } })}
              options={ops.map(([v, l]) => ({ v, label: l }))} />
            {refQ && (refQ.type === "radio" || refQ.type === "dropdown" || refQ.type === "checkbox") ? (
              <Select value={s.value} onChange={v => onUpdate({ showIf: { ...s, value: v } })}
                options={[{ v: "", label: "— pick a value —" }, ...(refQ.options || []).map(o => ({ v: o, label: o }))]} />
            ) : (
              <TextInput value={s.value} onChange={v => {
                const isNum = refQ && (refQ.type === "stars" || refQ.type === "nps" || refQ.type === "emoji");
                onUpdate({ showIf: { ...s, value: isNum ? Number(v) : v } });
              }} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddQuestion({ onAdd }) {
  const [open, setOpen] = useS_C(false);
  const types = [
    ["shorttext", "Short text"], ["longtext", "Paragraph"],
    ["stars", "★ Stars"], ["nps", "NPS 0–10"], ["emoji", "Emoji scale"],
    ["radio", "Radio"], ["checkbox", "Checkboxes"],
    ["dropdown", "Dropdown"], ["file", "File upload"],
  ];
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "10px 12px",
        fontFamily: '"Geist"', fontSize: 12, fontWeight: 500,
        color: "#111110", background: "transparent",
        border: "1.5px dashed #b8b7b1", borderRadius: 6, cursor: "pointer" }}>+ Add question</button>
      {open && (
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
          padding: 6, background: "#ede9dd", borderRadius: 6 }}>
          {types.map(([v, l]) => (
            <button key={v} type="button" onClick={() => { onAdd(v); setOpen(false); }} style={{
              padding: "8px 10px", fontSize: 11.5, color: "#111110", background: "#fff",
              border: "1px solid #d9d5c9", borderRadius: 5, cursor: "pointer",
              textAlign: "left", fontFamily: '"Geist"' }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function iconBtn(disabled) {
  return {
    width: 24, height: 24, fontFamily: '"Geist Mono"', fontSize: 11,
    color: disabled ? "#c6c4bc" : "#3a3a38",
    background: "transparent", border: "1px solid #e3dfd2", borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer", padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
}
function quickBtn(kind) {
  const base = {
    display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
    flex: 1, padding: "8px 10px",
    fontFamily: '"Geist"', fontSize: 12, fontWeight: 500,
    borderRadius: 6, cursor: "pointer", transition: "all 120ms",
  };
  if (kind === "solid") return { ...base, color: "#faf8f2", background: "#111110", border: "1px solid #111110" };
  return { ...base, color: "#111110", background: "transparent", border: "1px solid #b8b7b1" };
}

function LayoutThumbnail({ kind, selected }) {
  const stroke = selected ? "#111110" : "#6b6b67";
  const fill = selected ? "#ede9dd" : "#f7f5ef";
  return (
    <svg viewBox="0 0 80 48" width="100%" height="auto" style={{ display: "block", background: fill, borderRadius: 4 }}>
      {kind === "classic" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="20" y="6" width="40" height="36" rx="2"/>
          <line x1="26" y1="14" x2="44" y2="14" strokeWidth="1.5"/>
          <line x1="26" y1="22" x2="54" y2="22"/><line x1="26" y1="28" x2="54" y2="28"/><line x1="26" y1="34" x2="50" y2="34"/>
        </g>
      )}
      {kind === "split" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="4" y="6" width="30" height="36" rx="2" fill={stroke} fillOpacity="0.12"/>
          <rect x="38" y="6" width="38" height="36" rx="2"/>
          <line x1="10" y1="14" x2="28" y2="14" strokeWidth="1.5"/>
          <line x1="44" y1="16" x2="68" y2="16"/><line x1="44" y1="24" x2="68" y2="24"/><line x1="44" y1="32" x2="64" y2="32"/>
        </g>
      )}
      {kind === "stepped" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <line x1="10" y1="10" x2="70" y2="10" strokeWidth="1.5"/>
          <line x1="10" y1="10" x2="40" y2="10" stroke={stroke} strokeWidth="2.5"/>
          <rect x="18" y="20" width="44" height="18" rx="2"/>
          <line x1="24" y1="28" x2="42" y2="28"/>
        </g>
      )}
      {kind === "cards" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="14" y="14" width="44" height="26" rx="3" fill={fill}/>
          <rect x="18" y="10" width="44" height="26" rx="3" fill={fill}/>
          <rect x="22" y="6" width="44" height="26" rx="3" fill={fill}/>
          <line x1="28" y1="14" x2="48" y2="14" strokeWidth="1.5"/>
        </g>
      )}
      {kind === "convo" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="10" y="8" width="44" height="10" rx="3"/>
          <rect x="10" y="22" width="52" height="10" rx="3"/>
          <rect x="10" y="36" width="36" height="6" rx="2" stroke={stroke} fill={stroke} fillOpacity="0.2"/>
        </g>
      )}
      {kind === "magazine" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <line x1="8" y1="8" x2="72" y2="8" strokeWidth="2.5"/>
          <line x1="20" y1="14" x2="60" y2="14"/>
          <rect x="14" y="22" width="52" height="20" rx="1"/>
          <line x1="20" y1="30" x2="58" y2="30"/>
          <line x1="20" y1="36" x2="50" y2="36"/>
        </g>
      )}
    </svg>
  );
}

Object.assign(window, { ControlsPanel });
