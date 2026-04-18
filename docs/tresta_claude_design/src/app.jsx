/* Main app — device-aware stage, composable layout config, conditional logic. */

const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useLayoutEffect: useLE } = React;

const DEFAULT_HEADLINE = "How was your experience?";
const DEFAULT_SUBHEAD = "We'd love to hear your story. Your feedback helps us grow — and with your permission, might be shared with future customers.";

const ALL_PRESETS = { ...PRESETS, ...COMMUNITY_PRESETS };

function App() {
  const [preset, setPresetState] = useS(() => localStorage.getItem("tresta.preset") || "editorial");
  const [tokens, setTokens] = useS(() => {
    const saved = localStorage.getItem("tresta.tokens");
    if (saved) try { return JSON.parse(saved); } catch {}
    return { ...PRESETS.editorial.tokens };
  });
  const [layoutPreset, setLayoutPreset] = useS(() => localStorage.getItem("tresta.layoutPreset") || "classic");
  const [config, setConfig] = useS(() => {
    const saved = localStorage.getItem("tresta.config");
    if (saved) try { return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch {}
    return { ...DEFAULT_CONFIG, ...LAYOUT_PRESETS.classic.config };
  });
  const [questions, setQuestions] = useS(() => {
    const saved = localStorage.getItem("tresta.questions");
    if (saved) try { return JSON.parse(saved); } catch {}
    return DEFAULT_QUESTIONS;
  });
  const [headline, setHeadline] = useS(() => localStorage.getItem("tresta.headline") || DEFAULT_HEADLINE);
  const [subhead, setSubhead] = useS(() => localStorage.getItem("tresta.subhead") || DEFAULT_SUBHEAD);
  const [brandName, setBrandName] = useS(() => localStorage.getItem("tresta.brand") || PRESETS.editorial.tokens.brandName);
  const [values, setValues] = useS({});
  const [submitted, setSubmitted] = useS(false);
  const [device, setDevice] = useS(() => localStorage.getItem("tresta.device") || "desktop");

  useE(() => localStorage.setItem("tresta.preset", preset), [preset]);
  useE(() => localStorage.setItem("tresta.tokens", JSON.stringify(tokens)), [tokens]);
  useE(() => localStorage.setItem("tresta.layoutPreset", layoutPreset), [layoutPreset]);
  useE(() => localStorage.setItem("tresta.config", JSON.stringify(config)), [config]);
  useE(() => localStorage.setItem("tresta.questions", JSON.stringify(questions)), [questions]);
  useE(() => localStorage.setItem("tresta.headline", headline), [headline]);
  useE(() => localStorage.setItem("tresta.subhead", subhead), [subhead]);
  useE(() => localStorage.setItem("tresta.brand", brandName), [brandName]);
  useE(() => localStorage.setItem("tresta.device", device), [device]);

  const setPreset = (k) => {
    setPresetState(k);
    const t = { ...ALL_PRESETS[k].tokens };
    setTokens(t);
    setBrandName(t.brandName);
  };

  const applyLayoutPreset = (k) => {
    setLayoutPreset(k);
    setConfig(c => ({ ...DEFAULT_CONFIG, ...LAYOUT_PRESETS[k].config }));
  };

  const setToken = (k, v) => setTokens(t => ({ ...t, [k]: v }));
  const onEditLabel = (id, label) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, label } : q));
  const setValue = (id, v) => setValues(vs => ({ ...vs, [id]: v }));
  const onSubmit = () => setSubmitted(true);

  const resetAll = () => {
    if (!confirm("Reset everything to defaults?")) return;
    const t = { ...PRESETS.editorial.tokens };
    setPresetState("editorial");
    setTokens(t);
    setLayoutPreset("classic");
    setConfig({ ...DEFAULT_CONFIG, ...LAYOUT_PRESETS.classic.config });
    setQuestions(DEFAULT_QUESTIONS);
    setHeadline(DEFAULT_HEADLINE);
    setSubhead(DEFAULT_SUBHEAD);
    setBrandName(t.brandName);
    setValues({});
    setSubmitted(false);
  };

  const randomize = () => setTokens(t => ({ ...t, ...randomTokens() }));

  const ThankYou = () => (
    <ThankYouPanel tokens={tokens} values={values} questions={questions} brandName={brandName}
      onAgain={() => { setValues({}); setSubmitted(false); }} />
  );

  // Stage sizing per device
  const stage = {
    desktop: { w: null, h: null, frame: "flat",   label: "Desktop · 1280" },
    tablet:  { w: 820,  h: 1120, frame: "tablet", label: "iPad · 820×1120" },
    mobile:  { w: 390,  h: 780,  frame: "phone",  label: "iPhone · 390×780" },
  }[device];
  const isPhone = device === "mobile";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <ControlsPanel
        tokens={tokens} setToken={setToken} setTokens={setTokens}
        preset={preset} setPreset={setPreset}
        layoutPreset={layoutPreset} applyLayoutPreset={applyLayoutPreset}
        config={config} setConfig={setConfig}
        questions={questions} setQuestions={setQuestions}
        device={device} setDevice={setDevice}
        onRandomize={randomize} onReset={resetAll}
      />

      <div style={{ flex: 1, background: "#eae7df", position: "relative",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StageChrome stageLabel={stage.label}
          layoutLabel={LAYOUT_PRESETS[layoutPreset]?.label || "Custom"}
          presetLabel={ALL_PRESETS[preset]?.label || "Custom"} />

        <ScaledDeviceFrame device={device} stage={stage} tokens={tokens}>
          <div className="scroll" style={{
            width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden",
            background: tokens.bg,
          }}>
            <LayoutRenderer
              config={config} tokens={tokens}
              questions={questions} values={values}
              setValue={setValue} onEditLabel={onEditLabel}
              headline={headline} subhead={subhead}
              setHeadline={setHeadline} setSubhead={setSubhead}
              brandName={brandName} setBrandName={setBrandName}
              submitted={submitted} onSubmit={onSubmit}
              ThankYou={ThankYou}
              isPhone={isPhone}
            />
          </div>
        </ScaledDeviceFrame>
      </div>
    </div>
  );
}

function ScaledDeviceFrame({ device, stage, tokens, children }) {
  // Desktop fills the stage responsively; no scaling needed.
  if (device === "desktop") {
    return <DeviceFrame device={device} stage={stage} tokens={tokens}>{children}</DeviceFrame>;
  }
  // Tablet/mobile: measure stage, scale the fixed-size frame to fit.
  const wrapRef = useR(null);
  const [scale, setScale] = useS(1);

  useLE(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const compute = () => {
      const pad = 120; // room for chrome top/bottom
      const availW = el.clientWidth - 48;
      const availH = el.clientHeight - pad;
      const sw = availW / stage.w;
      const sh = availH / stage.h;
      const s = Math.min(sw, sh, 1);
      setScale(s > 0 ? s : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => { ro.disconnect(); window.removeEventListener("resize", compute); };
  }, [stage.w, stage.h, device]);

  return (
    <div ref={wrapRef} style={{
      width: stage.w * scale, height: stage.h * scale,
      position: "relative",
    }}>
      <div style={{
        width: stage.w, height: stage.h,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        position: "absolute", top: 0, left: 0,
      }}>
        <DeviceFrame device={device} stage={stage} tokens={tokens}>{children}</DeviceFrame>
      </div>
    </div>
  );
}

function DeviceFrame({ device, stage, tokens, children }) {
  if (device === "desktop") {
    return (
      <div style={{
        width: "calc(100% - 60px)", height: "calc(100% - 80px)",
        maxWidth: 1180,
        borderRadius: 10,
        border: `1px solid ${tokens.line}`,
        overflow: "hidden",
        background: tokens.bg,
        boxShadow: "0 30px 80px -40px rgba(0,0,0,0.35)",
        transition: "all 320ms cubic-bezier(.2,.8,.2,1)",
        position: "relative",
      }}>
        {children}
      </div>
    );
  }
  if (device === "tablet") {
    return (
      <div style={{
        width: stage.w, height: stage.h,
        borderRadius: 28,
        border: "10px solid #111110",
        padding: 0,
        overflow: "hidden",
        background: tokens.bg,
        boxShadow: "0 40px 100px -30px rgba(0,0,0,0.4), 0 0 0 2px #2a2a2a",
        transition: "all 320ms cubic-bezier(.2,.8,.2,1)",
        position: "relative",
      }}>
        {children}
      </div>
    );
  }
  // mobile
  return (
    <div style={{
      width: stage.w, height: stage.h,
      borderRadius: 44,
      border: "9px solid #111110",
      overflow: "hidden",
      background: tokens.bg,
      boxShadow: "0 40px 100px -30px rgba(0,0,0,0.4), 0 0 0 2px #2a2a2a",
      transition: "all 320ms cubic-bezier(.2,.8,.2,1)",
      position: "relative",
    }}>
      {/* notch */}
      <div style={{
        position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
        width: 100, height: 24, background: "#111110", borderRadius: 999, zIndex: 20,
      }}/>
      {children}
    </div>
  );
}

function StageChrome({ stageLabel, layoutLabel, presetLabel }) {
  return (
    <>
      <div style={{
        position: "absolute", top: 20, left: 24, right: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        pointerEvents: "none", zIndex: 10,
      }}>
        <div style={{ fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: 10.5,
          color: "#6b6b67", letterSpacing: "0.1em", textTransform: "uppercase",
          display: "flex", gap: 18, alignItems: "center" }}>
          <span>● Live</span>
          <span style={{ color: "#b8b7b1" }}>{layoutLabel} · {presetLabel} · {stageLabel}</span>
        </div>
        <div style={{ fontFamily: '"Geist Mono"', fontSize: 10.5, color: "#6b6b67",
          letterSpacing: "0.1em", textTransform: "uppercase" }}>
          tresta.studio / form
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 18, left: 24, right: 24,
        fontFamily: '"Geist Mono"', fontSize: 10.5, color: "#8d8b83", letterSpacing: "0.08em",
        textAlign: "center", pointerEvents: "none", zIndex: 10 }}>
        Tip: click any text in the preview to edit it · Questions with conditional logic only appear when their rule matches
      </div>
    </>
  );
}

function ThankYouPanel({ tokens, values, questions, brandName, onAgain }) {
  const rating = values[questions.find(q => q.type === "stars")?.id];
  const quote = Object.entries(values).find(([id]) => questions.find(q => q.id === id)?.type === "longtext")?.[1];
  const nameQ = questions.find(q => q.type === "shorttext");
  const name = nameQ ? values[nameQ.id] : null;
  const roleQ = questions.filter(q => q.type === "shorttext")[1];
  const role = roleQ ? values[roleQ.id] : null;

  return (
    <div style={{ fontFamily: tokens.fontBody, color: tokens.ink,
      animation: "fadeInUp 540ms cubic-bezier(.2,.8,.2,1)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 999,
        background: tokens.accent, color: tokens.accentInk,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
        animation: "pop 600ms cubic-bezier(.2,1.4,.3,1) 120ms both" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h1 style={{ fontFamily: tokens.fontHead, fontSize: tokens.sizeHead,
        fontWeight: tokens.weightHead, letterSpacing: `${tokens.trackingHead}em`,
        lineHeight: 1.05, margin: 0, marginBottom: 14, color: tokens.ink, textWrap: "balance" }}>
        Thank you.
      </h1>
      <p style={{ fontFamily: tokens.fontBody, fontSize: Math.round(tokens.sizeBase * 1.1),
        color: tokens.inkSoft, lineHeight: 1.5, margin: 0, marginBottom: 36, maxWidth: 460 }}>
        Your words mean a lot to us at {brandName}. Here's how your testimonial might appear:
      </p>

      <div style={{ background: tokens.surface, border: `1px solid ${tokens.line}`,
        borderRadius: Math.max(tokens.radius, 6), padding: "28px 30px",
        marginBottom: 32, position: "relative", overflow: "hidden",
        boxShadow: tokens.shadow === "hard" ? `6px 6px 0 0 ${tokens.ink}` : "0 14px 40px -20px rgba(0,0,0,0.18)" }}>
        <div style={{ position: "absolute", top: -10, left: 16,
          fontFamily: tokens.fontHead, fontSize: 100, lineHeight: 1,
          color: hexWithAlpha(tokens.accent, 0.18),
          pointerEvents: "none", userSelect: "none" }}>"</div>
        {rating && (
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {[1,2,3,4,5].map(n => (
              <svg key={n} viewBox="0 0 24 24" width="18" height="18" fill={n <= rating ? tokens.accent : tokens.line}>
                <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.7L6 22l1.5-7.3L2 10l7.1-1.1L12 2z"/>
              </svg>
            ))}
          </div>
        )}
        <p style={{ fontFamily: tokens.fontHead,
          fontSize: Math.round(tokens.sizeBase * 1.3),
          fontWeight: tokens.weightHead < 500 ? 400 : 500,
          lineHeight: 1.4, letterSpacing: `${tokens.trackingHead * 0.6}em`,
          color: tokens.ink, margin: 0, marginBottom: 20, textWrap: "pretty",
          position: "relative", zIndex: 1 }}>
          {quote || "Your testimonial will appear here, beautifully styled to match your brand."}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999,
            background: hexWithAlpha(tokens.accent, 0.2), color: tokens.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: tokens.fontHead, fontSize: 14, fontWeight: 600 }}>
            {(name || "?")[0]}
          </div>
          <div>
            <div style={{ fontFamily: tokens.fontBody, fontSize: tokens.sizeBase,
              fontWeight: 500, color: tokens.ink }}>{name || "Anonymous"}</div>
            {role && (
              <div style={{ fontFamily: tokens.fontMono, fontSize: 11, color: tokens.inkSoft,
                letterSpacing: "0.04em", marginTop: 2 }}>{role}</div>
            )}
          </div>
        </div>
      </div>

      <button type="button" onClick={onAgain} style={{
        fontFamily: tokens.fontBody, fontSize: Math.round(tokens.sizeBase * 0.95),
        color: tokens.inkSoft, background: "transparent",
        border: `1px solid ${tokens.line}`, borderRadius: tokens.radius,
        padding: "10px 16px", cursor: "pointer" }}>← Submit another</button>

      <style>{`
        @keyframes fadeInUp { from {opacity:0; transform: translateY(20px);} to {opacity:1; transform:none;} }
        @keyframes pop { 0% {transform:scale(0);} 70% {transform:scale(1.12);} 100% {transform:scale(1);} }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
