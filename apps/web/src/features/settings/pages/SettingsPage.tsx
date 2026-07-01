import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { settingsService } from "@/services";
import { ApiError } from "@/services/api/client";
import { CURRENT_USER_QUERY_KEY } from "@/lib/auth-session";
import { completeLogout } from "@/lib/auth-session";
import type { NotificationPreferences } from "@/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/user";

const SETTINGS_QUERY_KEY = ["settings"] as const;

const NOTIFICATION_TOGGLES: {
  key: keyof NotificationPreferences;
  label: string;
}[] = [
  { key: "notifyOnSubmission", label: "Notify me on new submissions" },
  { key: "notifyOnLinkExpiry", label: "Notify me on link expiry" },
  { key: "notifyOnBlockedDispatch", label: "Notify me on blocked dispatch" },
  { key: "notifyOnRemindersSent", label: "Notify me on reminders sent" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => settingsService.get(),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!data) return;
    setName(data.user.name);
    setEmail(data.user.email);
    setTitle(data.user.title);
    setPreferences(data.preferences);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsService.save({
        name: name.trim(),
        preferences,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, result.user);
      queryClient.setQueryData(SETTINGS_QUERY_KEY, result);
      toast.success("Settings saved.");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Failed to save settings.");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      settingsService.changePassword(currentPassword, newPassword, confirmPassword),
    onSuccess: async () => {
      toast.success("Password updated. Please sign in again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await completeLogout(queryClient);
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Failed to update password.");
    },
  });

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    passwordMutation.mutate();
  };

  if (isLoading && !data) {
    return (
      <AppShell>
        <div className="max-w-3xl space-y-6">
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage your profile, password, and admin panel notification preferences.
          </p>
        </div>

        <Section title="Profile">
          <Row label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Row>
          <Row label="Email">
            <Input value={email} disabled />
          </Row>
          <Row label="Role">
            <Input value={title} disabled />
          </Row>
        </Section>

        <Section title="Password">
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <Row label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Row>
            <Row label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </Row>
            <Row label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter new password"
              />
            </Row>
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordMutation.isPending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Notifications">
          <p className="text-xs text-muted-foreground pb-1">
            Control which events appear in your admin panel notification bell.
          </p>
          {NOTIFICATION_TOGGLES.map(({ key, label }) => (
            <ToggleRow
              key={key}
              label={label}
              checked={preferences[key]}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, [key]: checked }))
              }
            />
          ))}
        </Section>

        <div className="flex justify-end">
          <Button
            className="bg-navy hover:bg-navy/90 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
          >
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
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

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
