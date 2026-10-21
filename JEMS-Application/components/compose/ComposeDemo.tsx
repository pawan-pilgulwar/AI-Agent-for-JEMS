"use client";

import * as React from "react";
import { AlarmClock, Languages, ListChecks, PenLine, SquareCheckBig } from "lucide-react";
import { Compose, type ComposeCommand, type ComposeMention } from "@/components/ui/compose";

const AVATAR_BG = "e8b84b,4c8c9b,c0532f,8e7cc3,3f7f6f,d98b8b";
const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundColor=${AVATAR_BG}&backgroundType=solid&radius=50&scale=115`;

/** People the student can @mention — the support team. */
const MENTIONS: ComposeMention[] = [
  { id: "priya", label: "priya", sublabel: "support · resumes", avatar: avatarUrl("priya") },
  { id: "arjun", label: "arjun", sublabel: "support · interviews", avatar: avatarUrl("arjun") },
  { id: "meera", label: "meera", sublabel: "support · billing", avatar: avatarUrl("meera") },
];

/** Slash commands — quick actions on the message. */
const COMMANDS: ComposeCommand[] = [
  { id: "summarize", label: "summarize", hint: "Condense the thread", icon: <ListChecks /> },
  { id: "rewrite", label: "rewrite", hint: "Improve tone & clarity", icon: <PenLine /> },
  { id: "translate", label: "translate", hint: "To another language", icon: <Languages /> },
  { id: "todo", label: "todo", hint: "Create a task", icon: <SquareCheckBig /> },
  { id: "remind", label: "remind", hint: "Set a reminder", icon: <AlarmClock /> },
];

/**
 * Live-chat composer: mentions, slash commands, character limit, ⌘↵ to send.
 * Messages are kept in local state — swap `onSubmit` for a real send when the
 * chat backend exists.
 */
export default function ComposeDemo({ className }: { className?: string }) {
  const [sent, setSent] = React.useState<string[]>([]);

  return (
    <div className={className}>
      {sent.length > 0 && (
        <div className="mb-4 space-y-2">
          {sent.map((m, i) => (
            <div
              key={i}
              className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-navy px-3.5 py-2 text-[14px] text-white"
            >
              {m}
            </div>
          ))}
        </div>
      )}
      <Compose
        mentions={MENTIONS}
        commands={COMMANDS}
        maxLength={500}
        placeholder="Message our team…  press @ to mention, / for commands"
        onSubmit={(v) => setSent((s) => [...s, v])}
        onCommand={(c) => console.log("command:", c.label)}
        aria-label="Support chat message"
      />
    </div>
  );
}
