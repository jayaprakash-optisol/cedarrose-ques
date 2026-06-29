import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";


export default function SettingsPage() {
  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Workspace-level defaults for the analyst team.</p>
        </div>

        <Section title="Profile">
          <Row label="Name"><Input defaultValue="David Chen" /></Row>
          <Row label="Email"><Input defaultValue="david.chen@cedarrose.com" /></Row>
          <Row label="Role"><Input defaultValue="Senior Analyst" disabled /></Row>
        </Section>

        <Section title="Password">
          <Row label="Current password"><Input type="password" placeholder="••••••••" /></Row>
          <Row label="New password"><Input type="password" placeholder="At least 8 characters" /></Row>
          <Row label="Confirm new password"><Input type="password" placeholder="Re-enter new password" /></Row>
          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm">Update password</Button>
          </div>
        </Section>

        <Section title="Notifications">
          <ToggleRow label="Notify me on new submissions" defaultChecked />
          <ToggleRow label="Notify me on link expiry" defaultChecked />
          <ToggleRow label="Notify me on blocked dispatch" defaultChecked />
          <ToggleRow label="Notify me on reminders sent" defaultChecked />
        </Section>

        <div className="flex justify-end">
          <Button className="bg-navy hover:bg-navy/90 text-white">Save changes</Button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
