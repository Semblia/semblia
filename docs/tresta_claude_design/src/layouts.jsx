/* Unified layout renderer — composes flow × container × hero traits.
   Responsive: chooses mobile variants from config.mobileFlow / config.mobileContainer. */

const { useState: useS_L, useEffect: useE_L, useMemo: useM_L, useRef: useR_L } = React;

function textureBg(tokens) {
  if (tokens.texture === "grain") {
    const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>`);
    return `url("data:image/svg+xml;utf8,${svg}")`;
  }
  if (tokens.texture === "dots")  return `radial-gradient(${tokens.line} 1px, transparent 1px)`;
  if (tokens.texture === "lines") return `repeating-linear-gradient(135deg, ${tokens.line} 0 1px, transparent 1px 14px)`;
  return "none";
}
function textureSize(tokens) { return tokens.texture === "dots" ? "16px 16px" : "auto"; }

/* ── Shared bits ───────────────────────────────────────── */
function BrandMark({ tokens, brandName, onEditBrand, logoUrl, onAccent = false, size = 36 }) {
  const bg = onAccent ? tokens.accentInk : tokens.accent;
  const fg = onAccent ? tokens.accent : tokens.accentInk;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      {logoUrl ? (
        <img src={logoUrl} alt="" style={{ width: size, height: size, borderRadius: Math.min(8, tokens.radius), objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: Math.min(8, tokens.radius),
          background: bg, color: fg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: tokens.fontHead, fontWeight: 700, fontSize: Math.round(size * 0.5),
          flexShrink: 0,
        }}>{(brandName || "?")[0]}</div>
      )}
      <InlineEditable
        value={brandName}
        onChange={onEditBrand}
        style={{
          fontFamily: tokens.fontHead, fontSize: 18,
          fontWeight: tokens.weightHead,
          color: onAccent ? tokens.accentInk : tokens.ink,
          letterSpacing: `${tokens.trackingHead}em`,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      />
    </div>
  );
}

function PoweredBy({ tokens, onAccent = false }) {
  return (
    <div style={{
      fontFamily: tokens.fontMono, fontSize: 10.5,
      color: onAccent ? hexWithAlpha(tokens.accentInk, 0.65) : tokens.inkSoft,
      letterSpacing: "0.1em", textTransform: "uppercase",
      flexShrink: 0,
    }}>Powered by Tresta</div>
  );
}

function Headline({ tokens, headline, subhead, onEditHeadline, onEditSubhead, align = "left", size = 1, color, subColor }) {
  return (
    <div style={{ textAlign: align }}>
      <InlineEditable
        as="h1"
        value={headline}
        onChange={onEditHeadline}
        style={{
          display: "block",
          fontFamily: tokens.fontHead,
          fontSize: Math.round(tokens.sizeHead * size),
          fontWeight: tokens.weightHead,
          lineHeight: 1.05,
          letterSpacing: `${tokens.trackingHead}em`,
          color: color || tokens.ink,
          margin: 0, marginBottom: 14,
          textWrap: "balance",
        }}
      />
      <InlineEditable
        as="p"
        value={subhead}
        onChange={onEditSubhead}
        style={{
          display: "block",
          fontFamily: tokens.fontBody,
          fontSize: Math.round(tokens.sizeBase * 1.08),
          lineHeight: 1.5,
          color: subColor || tokens.inkSoft,
          margin: 0,
          textWrap: "pretty",
          maxWidth: 560,
          marginLeft: align === "center" ? "auto" : 0,
          marginRight: align === "center" ? "auto" : 0,
        }}
      />
    </div>
  );
}

/* ── HERO VARIANTS ─────────────────────────────────────── */
function HeroTop({ tokens, brandName, setBrandName, logoUrl, headline, subhead, setHeadline, setSubhead, showBrandPill, align = "left" }) {
  return (
    <div>
      {showBrandPill && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: 20, borderBottom: `1px solid ${tokens.line}`,
          marginBottom: 36, gap: 12, flexWrap: "wrap",
        }}>
          <BrandMark tokens={tokens} brandName={brandName} onEditBrand={setBrandName} logoUrl={logoUrl} />
          <PoweredBy tokens={tokens} />
        </div>
      )}
      <div style={{ marginBottom: 40 }}>
        <Headline tokens={tokens} headline={headline} subhead={subhead} onEditHeadline={setHeadline} onEditSubhead={setSubhead} align={align} />
      </div>
    </div>
  );
}

function HeroSide({ tokens, brandName, setBrandName, logoUrl, headline, subhead, setHeadline, setSubhead, isPhone }) {
  return (
    <div style={{
      background: tokens.dark
        ? `linear-gradient(145deg, ${tokens.accent} 0%, ${tokens.ink} 120%)`
        : `linear-gradient(145deg, ${tokens.accent} 0%, ${hexWithAlpha(tokens.accent, 0.55)} 100%)`,
      color: tokens.accentInk,
      padding: isPhone ? "32px 24px" : "56px 52px",
      display: "flex", flexDirection: "column",
      justifyContent: "space-between",
      minHeight: isPhone ? "auto" : "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, zIndex: 1 }}>
        <BrandMark tokens={tokens} brandName={brandName} onEditBrand={setBrandName} logoUrl={logoUrl} onAccent />
      </div>

      <div style={{ zIndex: 1, marginTop: isPhone ? 28 : 56 }}>
        <Headline
          tokens={tokens}
          headline={headline} subhead={subhead}
          onEditHeadline={setHeadline} onEditSubhead={setSubhead}
          size={isPhone ? 0.78 : 1.0}
          color={tokens.accentInk}
          subColor={hexWithAlpha(tokens.accentInk, 0.85)}
        />
      </div>

      <div style={{
        position: "absolute", right: -24, bottom: -60,
        fontFamily: tokens.fontHead, fontSize: isPhone ? 220 : 340, lineHeight: 1,
        color: hexWithAlpha(tokens.accentInk, 0.08),
        pointerEvents: "none", userSelect: "none",
      }}>"</div>

      <div style={{ zIndex: 1, fontFamily: tokens.fontMono, fontSize: 11, letterSpacing: "0.12em",
        textTransform: "uppercase", color: hexWithAlpha(tokens.accentInk, 0.7),
        marginTop: isPhone ? 28 : 48,
      }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: tokens.accentInk, marginRight: 8 }}/>
        2 minutes · 6 questions
      </div>
    </div>
  );
}

function HeroFloating({ tokens, brandName, setBrandName, logoUrl, headline, subhead, setHeadline, setSubhead, isPhone }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <BrandMark tokens={tokens} brandName={brandName} onEditBrand={setBrandName} logoUrl={logoUrl} size={32} />
      </div>
      <Headline tokens={tokens} headline={headline} subhead={subhead} onEditHeadline={setHeadline} onEditSubhead={setSubhead} size={isPhone ? 0.72 : 0.92} />
    </div>
  );
}

/* ── FLOW RENDERERS ────────────────────────────────────── */
function FlowAll({ tokens, questions, values, setValue, onEditLabel, onSubmit, density, isPhone }) {
  const gap = { compact: 20, default: 28, cozy: 36, airy: 44 }[tokens.density];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {questions.map(q => (
        <Field key={q.id} q={q} tokens={tokens}
          value={values[q.id]}
          onChange={(v) => setValue(q.id, v)}
          onEditLabel={(label) => onEditLabel(q.id, label)}
        />
      ))}
      <div style={{
        marginTop: 12,
        display: "flex",
        justifyContent: isPhone ? "stretch" : "flex-end",
        flexDirection: isPhone ? "column" : "row",
        gap: 12,
      }}>
        <SubmitButton tokens={tokens} label="Submit testimonial →" onClick={onSubmit} fullWidth={isPhone} />
      </div>
    </div>
  );
}

function FlowStepped({ tokens, questions, values, setValue, onEditLabel, onSubmit, isPhone, stickyProgress }) {
  const [step, setStep] = useS_L(0);
  const clamped = Math.min(step, Math.max(questions.length - 1, 0));
  const current = questions[clamped];
  const pct = questions.length === 0 ? 0 : Math.round(((clamped + 1) / questions.length) * 100);
  const isLast = clamped === questions.length - 1;

  useE_L(() => { if (step >= questions.length && questions.length > 0) setStep(questions.length - 1); }, [questions.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: isPhone ? 500 : 360 }}>
      {/* Progress */}
      <div style={{
        position: stickyProgress ? "sticky" : "static",
        top: 0, zIndex: 2,
        background: tokens.bg,
        paddingBottom: 14, marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontFamily: tokens.fontMono, fontSize: 11, color: tokens.inkSoft,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10,
        }}>
          <span>Question {clamped + 1} of {questions.length}</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 3, background: tokens.line, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: tokens.accent,
            transition: "width 320ms cubic-bezier(.2,.8,.2,1)" }} />
        </div>
      </div>

      {/* Current question */}
      <div style={{ flex: 1 }}>
        {current && (
          <div key={current.id} style={{ animation: "stepIn 320ms cubic-bezier(.2,.8,.2,1)" }}>
            <Field q={current} tokens={tokens}
              value={values[current.id]}
              onChange={(v) => setValue(current.id, v)}
              onEditLabel={(label) => onEditLabel(current.id, label)}
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <button type="button"
          onClick={() => setStep(Math.max(0, clamped - 1))}
          disabled={clamped === 0}
          style={{
            fontFamily: tokens.fontBody, fontSize: 14,
            color: clamped === 0 ? tokens.inkSoft : tokens.ink,
            background: "transparent", border: "none",
            cursor: clamped === 0 ? "not-allowed" : "pointer",
            opacity: clamped === 0 ? 0.4 : 1, padding: "10px 0",
          }}>← Back</button>
        {isLast ? (
          <SubmitButton tokens={tokens} label="Submit →" onClick={onSubmit} />
        ) : (
          <SubmitButton tokens={tokens} label="Continue →" onClick={() => setStep(clamped + 1)} />
        )}
      </div>
      <style>{`@keyframes stepIn { from {opacity:0; transform: translateY(12px);} to {opacity:1; transform:none;} }`}</style>
    </div>
  );
}

function FlowCards({ tokens, questions, values, setValue, onEditLabel, onSubmit, isPhone }) {
  const [active, setActive] = useS_L(0);
  useE_L(() => { if (active >= questions.length && questions.length > 0) setActive(questions.length - 1); }, [questions.length]);
  const clamped = Math.min(active, Math.max(questions.length - 1, 0));

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 24, minHeight: 280 }}>
        {questions.map((q, i) => {
          const offset = i - clamped;
          const isActive = i === clamped;
          const isPast = offset < 0;
          if (offset > 2) return null;
          return (
            <div key={q.id}
              onClick={() => !isActive && !isPast && setActive(i)}
              style={{
                position: i === clamped ? "relative" : "absolute",
                top: i === clamped ? undefined : 0, left: 0, right: 0,
                background: tokens.surface,
                border: `1px solid ${tokens.line}`,
                borderRadius: Math.max(tokens.radius, 8),
                padding: isPhone ? "24px 22px" : "32px 30px",
                transform: `translateY(${Math.max(offset, 0) * 14}px) scale(${1 - Math.max(offset, 0) * 0.03}) ${isPast ? "translateX(-120%)" : ""}`,
                opacity: isPast ? 0 : 1 - Math.max(offset, 0) * 0.12,
                zIndex: 100 - i,
                cursor: isActive ? "default" : (isPast ? "default" : "pointer"),
                transition: "all 360ms cubic-bezier(.2,.8,.2,1)",
                boxShadow: isActive
                  ? (tokens.shadow === "hard" ? `6px 6px 0 0 ${tokens.ink}` : "0 20px 50px -20px rgba(0,0,0,0.2)")
                  : "0 4px 16px -8px rgba(0,0,0,0.12)",
                pointerEvents: isActive || offset > 0 ? "auto" : "none",
              }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 18,
              }}>
                <div style={{ fontFamily: tokens.fontMono, fontSize: 10.5, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: tokens.inkSoft }}>
                  Card {String(i + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
                </div>
                {q.required && <div style={{ fontFamily: tokens.fontMono, fontSize: 10, color: tokens.accent,
                  letterSpacing: "0.1em", textTransform: "uppercase" }}>● required</div>}
              </div>
              <Field q={q} tokens={tokens}
                value={values[q.id]}
                onChange={(v) => setValue(q.id, v)}
                onEditLabel={(label) => onEditLabel(q.id, label)}
              />
            </div>
          );
        })}
      </div>

      <div style={{
        display: "flex",
        flexDirection: isPhone ? "column-reverse" : "row",
        justifyContent: "space-between", alignItems: isPhone ? "stretch" : "center", gap: 16,
      }}>
        <div style={{ display: "flex", gap: 6, justifyContent: isPhone ? "center" : "flex-start" }}>
          {questions.map((_, i) => (
            <button key={i} type="button" onClick={() => setActive(i)}
              style={{ width: i === clamped ? 24 : 8, height: 8, borderRadius: 999,
                background: i === clamped ? tokens.accent : tokens.line,
                border: "none", padding: 0, cursor: "pointer", transition: "all 240ms" }}/>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: isPhone ? "stretch" : "flex-end" }}>
          {clamped > 0 && (
            <button type="button" onClick={() => setActive(clamped - 1)} style={{
              fontFamily: tokens.fontBody, fontSize: 14,
              color: tokens.ink, background: "transparent",
              border: `1px solid ${tokens.line}`, borderRadius: tokens.radius,
              padding: "12px 18px", cursor: "pointer", flex: isPhone ? 1 : undefined,
            }}>← Prev</button>
          )}
          {clamped < questions.length - 1 ? (
            <SubmitButton tokens={tokens} label="Next →" onClick={() => setActive(clamped + 1)} fullWidth={isPhone} />
          ) : (
            <SubmitButton tokens={tokens} label="Submit →" onClick={onSubmit} fullWidth={isPhone} />
          )}
        </div>
      </div>
    </div>
  );
}

function FlowConvo({ tokens, questions, values, setValue, onEditLabel, onSubmit, isPhone }) {
  const [revealed, setRevealed] = useS_L(1);
  const visibleUpTo = Math.min(revealed, questions.length);

  // Auto-reveal next when current has a value
  useE_L(() => {
    if (visibleUpTo >= questions.length) return;
    const cur = questions[visibleUpTo - 1];
    if (cur && values[cur.id] != null && values[cur.id] !== "") {
      const t = setTimeout(() => setRevealed(r => Math.min(r + 1, questions.length)), 550);
      return () => clearTimeout(t);
    }
  }, [values, visibleUpTo, questions]);

  useE_L(() => { if (revealed > questions.length) setRevealed(Math.max(questions.length, 1)); }, [questions.length]);

  const allAnswered = questions.every(q => {
    if (!q.required) return true;
    const v = values[q.id];
    return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {questions.slice(0, visibleUpTo).map((q, i) => (
        <div key={q.id} style={{
          animation: i === visibleUpTo - 1 ? "convoIn 520ms cubic-bezier(.2,.8,.2,1)" : "none",
        }}>
          {/* Prompt bubble */}
          <div style={{
            fontFamily: tokens.fontMono, fontSize: 10.5,
            color: tokens.inkSoft, letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: 10,
          }}>
            {String(i + 1).padStart(2, "0")} · Tresta asks
          </div>
          <Field q={q} tokens={tokens}
            value={values[q.id]}
            onChange={(v) => setValue(q.id, v)}
            onEditLabel={(label) => onEditLabel(q.id, label)}
          />
        </div>
      ))}

      {visibleUpTo < questions.length && (
        <button type="button" onClick={() => setRevealed(r => r + 1)} style={{
          alignSelf: "flex-start", fontFamily: tokens.fontBody, fontSize: 14,
          color: tokens.inkSoft, background: "transparent",
          border: `1px dashed ${tokens.line}`, borderRadius: tokens.radius,
          padding: "10px 16px", cursor: "pointer",
        }}>↓ Skip &amp; continue</button>
      )}

      {visibleUpTo >= questions.length && (
        <div style={{ marginTop: 8, animation: "convoIn 520ms cubic-bezier(.2,.8,.2,1)" }}>
          <SubmitButton tokens={tokens} label={allAnswered ? "Submit testimonial →" : "Finish anyway →"} onClick={onSubmit} fullWidth={isPhone} />
        </div>
      )}
      <style>{`@keyframes convoIn { from {opacity:0; transform: translateY(16px);} to {opacity:1; transform:none;} }`}</style>
    </div>
  );
}

/* ── CONTAINER VARIANTS ────────────────────────────────── */
/* Renders hero + flow in appropriate layout. */
function renderFlow(flow, props) {
  switch (flow) {
    case "stepped":        return <FlowStepped {...props} />;
    case "cards":          return <FlowCards {...props} />;
    case "conversational": return <FlowConvo {...props} />;
    default:               return <FlowAll {...props} />;
  }
}

function BoxedContainer(props) {
  const { tokens, hero, heroProps, flow, flowProps, isPhone } = props;
  return (
    <div style={{
      background: tokens.bg, minHeight: "100%",
      padding: isPhone ? "28px 16px" : "48px 24px",
      backgroundImage: textureBg(tokens), backgroundSize: textureSize(tokens),
    }}>
      <div style={{
        maxWidth: 640, margin: "0 auto",
        background: tokens.surface,
        borderRadius: Math.max(tokens.radius, 4),
        border: `1px solid ${tokens.line}`,
        padding: isPhone ? "28px 22px" : "48px 52px",
        boxShadow: tokens.shadow === "soft" ? "0 30px 80px -40px rgba(0,0,0,0.25)" :
                   tokens.shadow === "hard" ? `8px 8px 0 0 ${tokens.ink}` : "none",
      }}>
        {hero === "top" && <HeroTop {...heroProps} />}
        {hero === "floating" && <HeroFloating {...heroProps} isPhone={isPhone} />}
        {renderFlow(flow, flowProps)}
      </div>
    </div>
  );
}

function CenteredContainer(props) {
  const { tokens, hero, heroProps, flow, flowProps, isPhone } = props;
  return (
    <div style={{
      background: tokens.bg, minHeight: "100%",
      padding: isPhone ? "32px 20px" : "72px 40px",
      backgroundImage: textureBg(tokens), backgroundSize: textureSize(tokens),
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {hero === "top" && <HeroTop {...heroProps} align={isPhone ? "left" : "center"} />}
        {hero === "floating" && <HeroFloating {...heroProps} isPhone={isPhone} />}
        {renderFlow(flow, flowProps)}
      </div>
    </div>
  );
}

function FullbleedContainer(props) {
  const { tokens, hero, heroProps, flow, flowProps, isPhone } = props;
  return (
    <div style={{
      background: tokens.bg, minHeight: "100%",
      padding: isPhone ? "28px 20px" : "56px 48px",
      backgroundImage: textureBg(tokens), backgroundSize: textureSize(tokens),
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {hero === "top" && <HeroTop {...heroProps} />}
        {hero === "floating" && <HeroFloating {...heroProps} isPhone={isPhone} />}
        {renderFlow(flow, flowProps)}
      </div>
    </div>
  );
}

function SplitContainer(props) {
  const { tokens, heroProps, flow, flowProps, isPhone } = props;
  return (
    <div style={{
      minHeight: "100%",
      display: isPhone ? "flex" : "grid",
      flexDirection: isPhone ? "column" : undefined,
      gridTemplateColumns: isPhone ? undefined : "minmax(320px, 44%) 1fr",
      background: tokens.bg,
    }}>
      <HeroSide {...heroProps} isPhone={isPhone} />
      <div style={{
        padding: isPhone ? "28px 20px" : "56px 64px",
        background: tokens.bg,
        backgroundImage: textureBg(tokens), backgroundSize: textureSize(tokens),
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ maxWidth: 560, width: "100%", flex: 1 }}>
          {renderFlow(flow, flowProps)}
        </div>
      </div>
    </div>
  );
}

/* ── Main layout renderer ─────────────────────────────── */
function LayoutRenderer(props) {
  const {
    config, tokens, questions, values, setValue, onEditLabel,
    headline, subhead, setHeadline, setSubhead,
    brandName, setBrandName, logoUrl,
    submitted, onSubmit, ThankYou, isPhone,
  } = props;

  // Pick effective flow/container based on viewport
  const effFlow = isPhone && config.mobileFlow !== "auto" ? config.mobileFlow : config.flow;
  const effContainer = isPhone && config.mobileContainer !== "auto" ? config.mobileContainer : config.container;
  const effHero = config.hero;

  // Filter questions by conditional logic
  const visibleQuestions = useM_L(
    () => questions.filter(q => evalShowIf(q, values)),
    [questions, values]
  );

  if (submitted) {
    return (
      <div style={{
        background: tokens.bg, minHeight: "100%",
        padding: isPhone ? "40px 20px" : "72px 48px",
        backgroundImage: textureBg(tokens), backgroundSize: textureSize(tokens),
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <ThankYou />
        </div>
      </div>
    );
  }

  const heroProps = {
    tokens, brandName, setBrandName, logoUrl,
    headline, subhead, setHeadline, setSubhead,
    showBrandPill: config.showBrandPill !== false,
  };

  const flowProps = {
    tokens, questions: visibleQuestions, values, setValue, onEditLabel,
    onSubmit, isPhone, stickyProgress: config.stickyProgress,
  };

  const Container = {
    boxed: BoxedContainer,
    split: SplitContainer,
    fullbleed: FullbleedContainer,
    centered: CenteredContainer,
  }[effContainer] || BoxedContainer;

  return (
    <Container
      tokens={tokens}
      hero={effHero}
      heroProps={heroProps}
      flow={effFlow}
      flowProps={flowProps}
      isPhone={isPhone}
    />
  );
}

Object.assign(window, { LayoutRenderer, LAYOUT_PRESETS });
