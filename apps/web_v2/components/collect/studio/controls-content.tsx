"use client";

import * as React from "react";
import { useStudioStore } from "@/lib/collect/studio-store";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { Textarea } from "@/components/ui/textarea";
import { SectionCollapsible, Row, StudioTextInput } from "./studio-primitives";
import { MemoQuestionRow, AddQuestion } from "./question-editor";

/* ─── Content section ─────────────────────────────────────────────────────── */

export function ContentSection({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const setHeadline = useStudioStore((s) => s.setHeadline);
  const setSubhead = useStudioStore((s) => s.setSubhead);
  const setBrandName = useStudioStore((s) => s.setBrandName);

  if (!draft) return null;

  return (
    <SectionCollapsible title="Content">
      <Row label="Headline">
        <StudioTextInput
          value={draft.headline}
          onChange={(v) => setHeadline(formId, v)}
        />
      </Row>
      <Row label="Subhead">
        <Textarea
          value={draft.subhead}
          onChange={(e) => setSubhead(formId, e.target.value)}
          rows={3}
          className="resize-y font-mono text-xs"
        />
      </Row>
      <Row label="Brand name">
        <StudioTextInput
          value={draft.brandName}
          onChange={(v) => setBrandName(formId, v)}
        />
      </Row>
    </SectionCollapsible>
  );
}

/* ─── Questions section ───────────────────────────────────────────────────── */

export function QuestionsSection({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const setQuestions = useStudioStore((s) => s.setQuestions);

  if (!draft) return null;

  return (
    <SectionCollapsible
      title="Questions & Logic"
      tag={String(draft.questions.length)}
    >
      <div className="mb-3 flex flex-col gap-2">
        {draft.questions.map((q, i) => (
          <MemoQuestionRow
            key={q.id}
            q={q}
            index={i}
            total={draft.questions.length}
            questions={draft.questions}
            onUpdate={(patch) => {
              const next = [...draft.questions];
              next[i] = { ...next[i], ...patch };
              setQuestions(formId, next);
            }}
            onRemove={() =>
              setQuestions(
                formId,
                draft.questions.filter((_, j) => j !== i),
              )
            }
            onMove={(dir) => {
              const next = [...draft.questions];
              const ni = i + dir;
              if (ni < 0 || ni >= next.length) return;
              [next[i], next[ni]] = [next[ni], next[i]];
              setQuestions(formId, next);
            }}
          />
        ))}
      </div>
      <AddQuestion
        onAdd={(type) => {
          setQuestions(formId, [
            ...draft.questions,
            {
              id: `q_${Date.now()}`,
              type: type as StudioQuestion["type"],
              label: "New question",
              required: false,
            },
          ]);
        }}
      />
    </SectionCollapsible>
  );
}
