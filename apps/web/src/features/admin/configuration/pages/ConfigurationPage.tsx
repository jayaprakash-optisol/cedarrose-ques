import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/admin/shared/formControls";


function Section({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </header>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  );
}

function Setting({
  label,
  help,
  children,
}: Readonly<{
  label: string;
  help?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-3 items-start">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {help && <div className="text-xs text-muted-foreground mt-1">{help}</div>}
      </div>
      <div className="flex justify-start md:justify-end">{children}</div>
    </div>
  );
}

function RewardTitleFields({
  idPrefix,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
}: Readonly<{
  idPrefix: string;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}>) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-title`} className="text-xs text-muted-foreground">Reward title</label>
        <Input id={`${idPrefix}-title`} value={title} onChange={(e) => onTitleChange(e.target.value)} className="mt-1" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-desc`} className="text-xs text-muted-foreground">Reward description</label>
        <Textarea id={`${idPrefix}-desc`} value={description} onChange={(e) => onDescriptionChange(e.target.value)} className="mt-1" rows={3} />
      </div>
    </div>
  );
}

function TierCard({
  borderColor,
  badgeColor,
  badgeLabel,
  active,
  onActiveChange,
  awardedWhenClassName,
  awardedWhen,
  children,
}: Readonly<{
  borderColor: string;
  badgeColor: string;
  badgeLabel: string;
  active: boolean;
  onActiveChange: (value: boolean) => void;
  awardedWhenClassName: string;
  awardedWhen: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div className="rounded-lg bg-card border border-border border-l-4 shadow-sm overflow-hidden" style={{ borderLeftColor: borderColor }}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`rounded-full ${badgeColor} text-white px-3 py-1 text-xs font-semibold`}>{badgeLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Active</span>
            <Switch checked={active} onCheckedChange={onActiveChange} />
          </div>
        </div>
        <div className={`rounded-md text-xs px-3 py-2 ${awardedWhenClassName}`}>{awardedWhen}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
      </div>
      <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
        Delivery: Post-submission confirmation screen + confirmation email
      </div>
    </div>
  );
}

function NumberStepper({
  value,
  onChange,
  min = 0,
}: Readonly<{
  value: number;
  onChange: (n: number) => void;
  min?: number;
}>) {
  return (
    <div className="inline-flex items-center rounded-md border border-border">
      <button
        className="px-2 h-9 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="w-14 text-center bg-transparent outline-none text-sm tabular-nums"
      />
      <button
        className="px-2 h-9 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ConfigPage() {
  const [linkValidity, setLinkValidity] = useState(10);
  const [tokenType, setTokenType] = useState("single-use");
  const [tokenUnit, setTokenUnit] = useState<"hours" | "minutes">("hours");
  const [tokenHours, setTokenHours] = useState(24);
  const [tokenMinutes, setTokenMinutes] = useState(60);
  const [otpExpiry, setOtpExpiry] = useState(10);
  const [otpRetry, setOtpRetry] = useState(3);
  const [lockoutDuration, setLockoutDuration] = useState(15);
  const [otpResend, setOtpResend] = useState(3);
  const [r1, setR1] = useState(3);
  const [r2, setR2] = useState(5);
  const [r3, setR3] = useState(7);
  const [expiry, setExpiry] = useState(10);

  const [gamification, setGamification] = useState(true);
  const [midPrompt, setMidPrompt] = useState(true);
  const [midText, setMidText] = useState("You are halfway there — great progress!");
  const [nearPrompt, setNearPrompt] = useState(true);
  const [nearText, setNearText] = useState("You are 80% complete — only one section remaining.");
  const [rewardSystem, setRewardSystem] = useState(true);

  const [tier1Title, setTier1Title] = useState("Cedar Rose Insights Access");
  const [tier1Desc, setTier1Desc] = useState(
    "Access to selected Cedar Rose insights and deliverables relevant to your company.",
  );
  const [tier1Accel, setTier1Accel] = useState(true);
  const [tier1Discount, setTier1Discount] = useState(true);
  const [tier1Active, setTier1Active] = useState(true);

  const [tier2Title, setTier2Title] = useState("Cedar Rose Service Information");
  const [tier2Desc, setTier2Desc] = useState(
    "Access to Cedar Rose service information and standard report processing.",
  );
  const [tier2Active, setTier2Active] = useState(true);

  const milestones = [
    { label: "Dispatch", day: 0, fixed: true },
    { label: "Reminder 1", day: r1 },
    { label: "Reminder 2", day: r2 },
    { label: "Final Reminder", day: r3 },
    { label: "Expiry", day: expiry },
  ];

  return (
    <AppShell>
      <div className="space-y-4 pb-24">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Platform Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Centralised settings for questionnaire dispatch, reminders, rewards, and audit.
          </p>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          Changes to platform configuration take effect immediately for all new questionnaire
          dispatches. Existing active cases are not affected.
        </div>

        <Section title="Link & Expiry Settings" description="Controls the lifecycle of questionnaire links sent to subjects.">
          <Setting
            label="Link expires after (days)"
            help="After this many days from dispatch, the tokenized link expires. Analysts can extend individual links from the case tracker."
          >
            <Input type="number" value={linkValidity} onChange={(e) => setLinkValidity(Number(e.target.value))} className="w-28" />
          </Setting>
          <Setting
            label="Authentication token type"
            help="Single-use tokens are invalidated after each authenticated session. This prevents link sharing between companies."
          >
            <Select value={tokenType} onValueChange={setTokenType}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single-use">Single-use per session (recommended)</SelectItem>
                <SelectItem value="time-based">Time-based only</SelectItem>
              </SelectContent>
            </Select>
          </Setting>
          <div className="rounded-lg bg-muted/40 border-l-2 border-border px-4 py-3 animate-fade-in">
            {tokenType === "single-use" ? (
              <p className="text-xs text-emerald-700">
                ✓ Token is invalidated after each authenticated session. Prevents link sharing between companies.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Token validity duration</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    The tokenized link will expire after this duration from the moment it is first clicked, regardless of session activity.
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name="token-unit"
                      checked={tokenUnit === "hours"}
                      onChange={() => setTokenUnit("hours")}
                    />
                    <span className="w-20">Hours</span>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={tokenHours}
                      onChange={(e) => setTokenHours(Number(e.target.value))}
                      disabled={tokenUnit !== "hours"}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">hours</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name="token-unit"
                      checked={tokenUnit === "minutes"}
                      onChange={() => setTokenUnit("minutes")}
                    />
                    <span className="w-20">Minutes</span>
                    <Input
                      type="number"
                      min={5}
                      max={1440}
                      value={tokenMinutes}
                      onChange={(e) => setTokenMinutes(Number(e.target.value))}
                      disabled={tokenUnit !== "minutes"}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </label>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2">
                  ⚠ Time-based tokens do not invalidate on session end. The same link can be reopened within the validity window. Single-use per session is recommended for higher security.
                </div>
                <p className="text-xs text-muted-foreground">
                  {tokenUnit === "hours"
                    ? `Link will remain active for ${tokenHours} hours (${(tokenHours * 60).toLocaleString()} minutes) from first click.`
                    : `Link will remain active for ${tokenMinutes} minutes from first click.`}
                </p>
              </div>
            )}
          </div>
        </Section>

        <Section title="OTP Authentication" description="Controls the one-time password sent to subjects during authentication (WF-02).">
          <Setting label="OTP code expires after (minutes)" help="After this period the OTP is invalid and the subject must request a new one.">
            <Input type="number" value={otpExpiry} onChange={(e) => setOtpExpiry(Number(e.target.value))} className="w-28" />
          </Setting>
          <Setting label="Maximum incorrect OTP attempts before lockout" help="After this many failed attempts, the session is locked for the duration set below.">
            <NumberStepper value={otpRetry} onChange={setOtpRetry} />
          </Setting>
          <Setting label="Session lock duration after failed OTP attempts (minutes)" help="The subject must wait this long before trying again after exceeding the maximum failed attempts.">
            <Input type="number" value={lockoutDuration} onChange={(e) => setLockoutDuration(Number(e.target.value))} className="w-28" />
          </Setting>
          <Setting label="Maximum OTP resend requests per session" help="Subjects can request a new OTP up to this many times per authentication session.">
            <NumberStepper value={otpResend} onChange={setOtpResend} />
          </Setting>
        </Section>

        <Section
          title="Automated Reminder Schedule"
          description="Configure when reminder emails are automatically sent to subjects who have not submitted. Timings are days after the dispatch date."
        >
          <div className="rounded-md bg-secondary/40 border border-border p-5">
            <div className="flex items-center justify-between gap-4 relative">
              <div className="absolute left-6 right-6 top-1/2 h-px bg-border -z-0" />
              {milestones.map((m) => (
                <div key={m.label} className="flex flex-col items-center text-center z-10">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    {m.label}
                  </div>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${m.fixed ? "bg-navy text-white" : "bg-card border border-border text-foreground"}`}>
                    {m.day}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">Day {m.day}</div>
                </div>
              ))}
            </div>
          </div>

          <Setting label="Reminder 1 — friendly nudge (day)" help="Friendly reminder. Includes link, deadline, and progress indicator if any data saved.">
            <Input type="number" value={r1} onChange={(e) => setR1(Number(e.target.value))} className="w-28" />
          </Setting>
          <Setting label="Reminder 2 — deadline highlight (day)" help="Highlights the submission deadline. Mentions completion incentives.">
            <Input type="number" value={r2} onChange={(e) => setR2(Number(e.target.value))} className="w-28" />
          </Setting>
          <Setting label="Reminder 3 — final notice (day)" help="Final reminder. Urgency tone. States questionnaire closes on [date]. Lists incentives.">
            <Input type="number" value={r3} onChange={(e) => setR3(Number(e.target.value))} className="w-28" />
          </Setting>
          <Setting label="Auto-close and expire link (day)" help="No further emails sent after this day. Link expires. Status updated to EXPIRED. Analyst notified via dashboard alert.">
            <Input type="number" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} className="w-28" />
          </Setting>
        </Section>

        <Section
          title="Gamification & Rewards"
          description="Configure the reward system that incentivises subjects to complete questionnaires (WF-07). Changes take effect for new submissions only."
        >
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Reward content must be confirmed with the Cedar Rose commercial team before publishing. Subjects who have already submitted will not be retroactively affected.
          </div>

          {/* SUB 1 — In-form engagement */}
          <div className="space-y-3 pt-2">
            <div className="border-b border-border pb-2">
              <h4 className="text-[15px] font-bold text-navy">In-form engagement</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Controls progress mechanics shown to the subject while completing the form.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Progress engagement</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Show progress bar, section completion badges, and completion prompts throughout the form.</div>
                </div>
                <Switch checked={gamification} onCheckedChange={setGamification} />
              </div>

              <div className={`pl-4 border-l-2 border-border space-y-4 ${gamification ? "" : "opacity-40 pointer-events-none"}`}>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">Mid-form message at 50%</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Shown when subject reaches 50% completion.</div>
                    </div>
                    <Switch checked={midPrompt} onCheckedChange={setMidPrompt} disabled={!gamification} />
                  </div>
                  {midPrompt && (
                    <Input value={midText} onChange={(e) => setMidText(e.target.value)} className="mt-2" />
                  )}
                </div>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">Near-completion message at 80%</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Shown when subject reaches 80% completion.</div>
                    </div>
                    <Switch checked={nearPrompt} onCheckedChange={setNearPrompt} disabled={!gamification} />
                  </div>
                  {nearPrompt && (
                    <Input value={nearText} onChange={(e) => setNearText(e.target.value)} className="mt-2" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SUB 2 — Reward Tiers */}
          <div className="space-y-3 pt-4">
            <div className="border-b border-border pb-2">
              <h4 className="text-[15px] font-bold text-navy">Reward tiers</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Configure what subjects receive after submitting. Displayed on the post-submission screen and sent by email.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-semibold">Enable post-submission reward unlock</div>
              <Switch checked={rewardSystem} onCheckedChange={setRewardSystem} />
            </div>

            <div className={`space-y-4 ${rewardSystem ? "" : "opacity-40 pointer-events-none"}`}>
              {/* Tier 1 */}
              <TierCard
                borderColor="#27AE60"
                badgeColor="bg-[#27AE60]"
                badgeLabel="Tier 1 — Full Completion"
                active={tier1Active}
                onActiveChange={setTier1Active}
                awardedWhenClassName="bg-green-50 text-green-900"
                awardedWhen={
                  <>
                    <span className="font-semibold">Awarded when:</span> ALL mandatory AND optional fields submitted · Status = COMPLETED
                  </>
                }
              >
                <RewardTitleFields
                  idPrefix="tier1-reward"
                  title={tier1Title}
                  onTitleChange={setTier1Title}
                  description={tier1Desc}
                  onDescriptionChange={setTier1Desc}
                />
                <div>
                  <div className="text-xs font-semibold mb-2">Benefits included</div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm">Accelerated report processing</div>
                        <div className="text-xs text-muted-foreground">Subject's report is prioritised</div>
                      </div>
                      <Switch checked={tier1Accel} onCheckedChange={setTier1Accel} />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm">Service discount eligibility</div>
                        <div className="text-xs text-muted-foreground">Subject eligible for applicable discount</div>
                      </div>
                      <Switch checked={tier1Discount} onCheckedChange={setTier1Discount} />
                    </div>
                  </div>
                </div>
              </TierCard>

              {/* Tier 2 */}
              <TierCard
                borderColor="#F39C12"
                badgeColor="bg-[#F39C12]"
                badgeLabel="Tier 2 — Core Completion"
                active={tier2Active}
                onActiveChange={setTier2Active}
                awardedWhenClassName="bg-amber-50 text-amber-900"
                awardedWhen={
                  <>
                    <span className="font-semibold">Awarded when:</span> All mandatory fields submitted, some optional missing · Status = COMPLETED — MISSING DATA
                  </>
                }
              >
                <RewardTitleFields
                  idPrefix="tier2-reward"
                  title={tier2Title}
                  onTitleChange={setTier2Title}
                  description={tier2Desc}
                  onDescriptionChange={setTier2Desc}
                />
                <div>
                  <div className="text-xs font-semibold mb-2">Benefits included</div>
                  <div className="space-y-3 opacity-60">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm">Accelerated report processing</div>
                        <Switch checked={false} disabled />
                      </div>
                      <div className="text-xs text-muted-foreground">Not available for Tier 2</div>
                    </div>
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm">Service discount eligibility</div>
                        <Switch checked={false} disabled />
                      </div>
                      <div className="text-xs text-muted-foreground">Not available in Phase 1</div>
                    </div>
                  </div>
                </div>
              </TierCard>

              {/* No reward row */}
              <div className="flex items-center gap-4 rounded-md border border-dashed border-border bg-muted/20 px-4 py-3">
                <span className="rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-semibold">No reward</span>
                <div className="flex-1 text-xs text-muted-foreground">Questionnaire not submitted or expired before submission · No incentive communication sent.</div>
                <span className="text-xs text-muted-foreground">N/A</span>
              </div>
            </div>
          </div>
        </Section>

      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between z-20">
        <div className="text-xs text-muted-foreground">Last saved: 3 May 2026, 14:22 by David Chen</div>
        <div className="flex items-center gap-3">
          <button className="text-sm text-muted-foreground hover:text-foreground">Discard changes</button>
          <Button
            className="bg-navy hover:bg-navy/90 text-white"
            onClick={() =>
              toast.success("Configuration saved. Changes will apply to all new questionnaire dispatches.")
            }
          >
            Save all changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
