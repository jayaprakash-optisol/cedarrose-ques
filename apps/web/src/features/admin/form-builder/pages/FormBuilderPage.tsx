import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GripVertical,
  Trash2,
  Plus,
  X,
  Lock,
  
  ChevronDown,
  MoreHorizontal,
  Pencil,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Info,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { templatesService } from "@/services";
import { ApiError } from "@/services/api/client";
import type {
  FieldType,
  Question,
  Section,
  Template,
  TableColumn,
  Condition,
  Validation,
} from "@/types/template";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text (single line)" },
  { value: "longtext", label: "Long text (paragraph)" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date picker" },
  { value: "dropdown", label: "Dropdown (single select)" },
  { value: "radio", label: "Multiple choice (radio)" },
  { value: "multiselect", label: "Multi-select (checkbox group)" },
  { value: "file", label: "File upload" },
  { value: "table", label: "Dynamic table (row repeater)" },
  { value: "esign", label: "E-signature" },
  { value: "toggle", label: "Toggle (yes/no)" },
  { value: "url", label: "URL" },
  { value: "support_doc", label: "Document upload" },
];

export default function FormBuilderPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Template | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRecipient, setNewRecipient] = useState<Template["recipientType"]>("Supplier");
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const { data: templateList = [], isLoading: listLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templatesService.list(),
  });

  const { data: loadedTemplate, isLoading: detailLoading } = useQuery({
    queryKey: ["templates", selectedId],
    queryFn: () => templatesService.getById(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!selectedId && templateList.length > 0) {
      setSelectedId(templateList[0].id);
    }
  }, [templateList, selectedId]);

  useEffect(() => {
    if (loadedTemplate) {
      setDraft(structuredClone(loadedTemplate));
    }
  }, [loadedTemplate]);

  const library = templateList;

  const createTemplate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Template name is required");
      return;
    }
    try {
      const created = await templatesService.create({ name, recipientType: newRecipient });
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setSelectedId(created.id);
      setDraft(structuredClone(created));
      setNewName("");
      setNewRecipient("Supplier");
      setNewOpen(false);
      toast.success("Template created");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create template");
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await templatesService.save(draft);
      setDraft(structuredClone(saved));
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      await queryClient.invalidateQueries({ queryKey: ["templates", saved.id] });
      toast.success("Template saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: Template["status"]) => {
    if (!draft) return;
    setStatusUpdating(true);
    try {
      const updated = await templatesService.updateStatus(draft.id, status);
      setDraft((prev) => (prev ? { ...prev, status: updated.status } : prev));
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(status === "Active" ? "Template activated" : "Template set to draft");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await templatesService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      if (selectedId === id) {
        const remaining = library.filter((t) => t.id !== id);
        setSelectedId(remaining[0]?.id ?? null);
        setDraft(null);
      }
      toast.success("Template deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete template");
    }
  };

  const updateDraft = (patch: Partial<Template>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateSections = (fn: (s: Section[]) => Section[]) => {
    if (!draft) return;
    const next = fn(draft.sections).map((s, i) => ({ ...s, number: i + 1 }));
    updateDraft({ sections: next });
  };

  const tpl = draft;

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Form Builder</h2>
          <p className="text-sm text-muted-foreground">
            Manage questionnaire templates dispatched to subjects.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
          <TemplateLibrary
            templates={library}
            selectedId={selectedId ?? ""}
            loading={listLoading}
            onSelect={setSelectedId}
            onNew={() => setNewOpen(true)}
            onDelete={handleDelete}
          />
          {listLoading || (selectedId && detailLoading) ? (
            <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">
              Loading template…
            </div>
          ) : tpl ? (
            <BuilderCanvas
              tpl={tpl}
              updateTpl={updateDraft}
              updateSections={updateSections}
              onSave={handleSave}
              onStatusChange={handleStatusChange}
              saving={saving}
              statusUpdating={statusUpdating}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">
              Select or create a template to begin editing.
            </div>
          )}
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Template name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Enhanced KYC — Supplier"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Recipient</label>
              <Select value={newRecipient} onValueChange={(v) => setNewRecipient(v as Template["recipientType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Business Analytics Report">Business Analytics Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy/90 text-white" onClick={() => void createTemplate()}>Create template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}

function TemplateLibrary({
  templates,
  selectedId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: {
  templates: Template[];
  selectedId: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="rounded-lg border border-border bg-card p-3 space-y-3 h-fit">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Questionnaire templates</h3>
      </div>
      <Button className="w-full bg-navy hover:bg-navy/90 text-white" onClick={onNew}>
        <Plus className="h-4 w-4 mr-1" /> New template
      </Button>
      {loading && (
        <p className="text-xs text-muted-foreground px-1">Loading templates…</p>
      )}
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="relative group">
          <button
            onClick={() => onSelect(t.id)}
            className={[
              "w-full text-left rounded-md border p-3 transition-colors",
              t.id === selectedId
                ? "border-navy bg-navy-soft"
                : "border-border bg-card hover:bg-secondary/60",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm pr-6">{t.name}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last edited {t.lastEdited} · {t.editor}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  (t.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : "bg-secondary text-muted-foreground")
                }
              >
                {t.status}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-medium">
                {t.recipientType}
              </span>
            </div>
          </button>
          {t.status === "Draft" && (
            <button
              type="button"
              onClick={() => onDelete(t.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-status-abandoned-fg hover:bg-secondary transition-opacity"
              title="Delete draft template"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function BuilderCanvas({
  tpl,
  updateTpl,
  updateSections,
  onSave,
  onStatusChange,
  saving,
  statusUpdating,
}: {
  tpl: Template;
  updateTpl: (p: Partial<Template>) => void;
  updateSections: (fn: (s: Section[]) => Section[]) => void;
  onSave: () => void | Promise<void>;
  onStatusChange: (status: Template["status"]) => void | Promise<void>;
  saving?: boolean;
  statusUpdating?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const summary = useMemo(() => {
    const all = tpl.sections.flatMap((s) => s.questions);
    return {
      total: all.length,
      required: all.filter((q) => q.required).length,
      optional: all.filter((q) => !q.required).length,
    };
  }, [tpl]);

  const addSection = (title: string, description: string, afterIdx: number) => {
    const newSec: Section = {
      id: `sec-${Date.now()}`,
      number: 0,
      title: title || "Untitled section",
      description: description || undefined,
      questions: [],
    };
    updateSections((arr) => {
      const next = [...arr];
      next.splice(afterIdx + 1, 0, newSec);
      return next;
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card flex flex-col">
      <header className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <Input
          value={tpl.name}
          onChange={(e) => updateTpl({ name: e.target.value })}
          className="text-base font-semibold flex-1 min-w-[260px]"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Draft</span>
          <Switch
            checked={tpl.status === "Active"}
            disabled={statusUpdating}
            onCheckedChange={(v) => void onStatusChange(v ? "Active" : "Draft")}
          />
          <span className="text-muted-foreground">Active</span>
        </div>
        <Button
          className="bg-navy hover:bg-navy/90 text-white"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : "Save template"}
        </Button>
      </header>

      <div className="p-4 space-y-3 pb-24">
        {tpl.sections.map((sec, idx) => (
          <SectionCard
            key={sec.id}
            section={sec}
            isFirst={idx === 0}
            isLast={idx === tpl.sections.length - 1}
            onChange={(updated) =>
              updateSections((arr) => arr.map((s) => (s.id === sec.id ? updated : s)))
            }
            onRemove={() =>
              updateSections((arr) => arr.filter((s) => s.id !== sec.id))
            }
            onMove={(dir) =>
              updateSections((arr) => {
                const i = arr.findIndex((s) => s.id === sec.id);
                const j = dir === "up" ? i - 1 : i + 1;
                if (j < 0 || j >= arr.length) return arr;
                const next = [...arr];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
              })
            }
          />
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full rounded-lg border-[1.5px] border-dashed border-navy bg-card hover:bg-navy-soft/50 transition-colors py-4 flex items-center justify-center gap-2 text-navy text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add new section
        </button>

        <AddSectionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          sections={tpl.sections}
          onAdd={addSection}
        />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">{summary.total}</strong> questions total ·{" "}
        <strong className="text-foreground">{summary.required}</strong> required (Tier 1) ·{" "}
        <strong className="text-foreground">{summary.optional}</strong> optional (Tier 2)
      </div>
    </section>
  );
}

function AddSectionDialog({
  open,
  onOpenChange,
  sections,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sections: Section[];
  onAdd: (title: string, description: string, afterIdx: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [pos, setPos] = useState(String(sections.length - 1));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setTitle("");
          setDesc("");
          setPos(String(sections.length - 1));
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new section</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Section title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Financial Information"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Section description (optional)</label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Brief description of what this section covers"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-navy hover:bg-navy/90 text-white"
            onClick={() => {
              onAdd(title, desc, sections.length - 1);
              onOpenChange(false);
            }}
          >
            Add section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({
  section,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
}: {
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  onChange: (s: Section) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(section.title);
  const update = (patch: Partial<Section>) => onChange({ ...section, ...patch });

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    update({
      questions: section.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  };
  const deleteQuestion = (id: string) => {
    update({ questions: section.questions.filter((q) => q.id !== id) });
  };
  const addQuestion = () => {
    const id = `q-${Date.now()}`;
    update({
      questions: [
        ...section.questions,
        { id, text: "", type: "text", required: false, prefill: false },
      ],
    });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card border-l-4 border-l-navy">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40">
        <CollapsibleTrigger className="flex-1 flex items-center justify-between text-left">
          <div className="text-sm font-semibold">
            Section {section.number} — {section.title}
          </div>
          <div className="flex items-center gap-3 mr-2">
            <span className="text-xs text-muted-foreground">{section.questions.length} questions</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-2 p-1 rounded hover:bg-secondary text-muted-foreground" aria-label="Section options">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRenameVal(section.title); setRenameOpen(true); }}>
              <Pencil className="h-4 w-4 mr-2" /> Rename section
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isFirst} onClick={() => onMove("up")}>
              <ArrowUp className="h-4 w-4 mr-2" /> Move section up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLast} onClick={() => onMove("down")}>
              <ArrowDown className="h-4 w-4 mr-2" /> Move section down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setRemoveOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Remove section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3">
          {section.banner && (
            <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 text-xs">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{section.banner}</span>
            </div>
          )}
          {section.description && (
            <p className="text-xs text-muted-foreground">{section.description}</p>
          )}
          {section.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              allQuestions={section.questions}
              onChange={(patch) => updateQuestion(q.id, patch)}
              onDelete={() => deleteQuestion(q.id)}
            />
          ))}
          <button
            onClick={addQuestion}
            className="w-full rounded-md border border-dashed border-border bg-secondary/40 hover:bg-secondary py-3 flex items-center justify-center gap-2 text-muted-foreground text-sm"
          >
            <Plus className="h-4 w-4" /> Add question to this section
          </button>
        </div>
      </CollapsibleContent>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename section</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy/90 text-white" onClick={() => { update({ title: renameVal }); setRenameOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove this section?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove Section {section.number} — {section.title} and all {section.questions.length} questions inside it. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onRemove(); setRemoveOpen(false); }}>Remove section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

function QuestionCard({
  question,
  allQuestions,
  onChange,
  onDelete,
}: {
  question: Question;
  allQuestions: Question[];
  onChange: (patch: Partial<Question>) => void;
  onDelete: () => void;
}) {
  const [optInput, setOptInput] = useState("");
  const [showHelp, setShowHelp] = useState(!!question.helpText);
  const [confirmDel, setConfirmDel] = useState(false);

  const updateValidation = (patch: Partial<Validation>) => {
    onChange({ validation: { ...(question.validation ?? {}), ...patch } });
  };
  const updateColumn = (idx: number, patch: Partial<TableColumn>) => {
    const cols = [...(question.columns ?? [])];
    cols[idx] = { ...cols[idx], ...patch };
    onChange({ columns: cols });
  };

  return (
    <div className="rounded-md border p-3 space-y-3 bg-background border-border">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0 cursor-grab" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {question.required ? (
              <span className="text-destructive font-bold text-sm" title="Tier 1 — Required">*</span>
            ) : (
              <span className="text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 px-1.5 py-0.5">
                Optional
              </span>
            )}
            {question.systemControlled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                <Lock className="h-3 w-3" /> System
              </span>
            )}
          </div>
          <Input
            value={question.text}
            onChange={(e) => onChange({ text: e.target.value })}
            disabled={question.systemControlled}
            placeholder="Question label"
          />
          {showHelp && (
            <div className="flex items-start gap-1.5 pt-1">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
              <Input
                value={question.helpText ?? ""}
                onChange={(e) => onChange({ helpText: e.target.value })}
                placeholder="Help text shown to subject below this field..."
                className="h-8 text-xs italic"
              />
            </div>
          )}
          {!showHelp && (
            <button
              onClick={() => setShowHelp(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add help text
            </button>
          )}
          {question.helpText && !showHelp && (
            <p className="text-xs italic text-muted-foreground">{question.helpText}</p>
          )}
        </div>
        {question.systemControlled ? (
          <Lock className="h-4 w-4 text-muted-foreground mt-2" />
        ) : (
          <Popover open={confirmDel} onOpenChange={setConfirmDel}>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-destructive mt-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 space-y-2">
              <p className="text-sm">Remove this question?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDel(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={() => { setConfirmDel(false); onDelete(); }} className="text-xs text-destructive font-medium">Yes, remove</button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 pl-6 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select
            value={question.type}
            onValueChange={(v) => onChange({ type: v as FieldType })}
            disabled={question.systemControlled}
          >
            <SelectTrigger className="w-[220px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={question.required}
            onCheckedChange={(v) => onChange({ required: v })}
            disabled={question.systemControlled}
          />
          <label className="text-xs">Required</label>
        </div>
      </div>

      {/* Validation rules */}
      {question.type === "number" && (
        <div className="pl-6 flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground">Min</label>
          <Input
            type="number"
            value={question.validation?.min ?? ""}
            onChange={(e) => updateValidation({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="h-8 w-24"
          />
          <label className="text-xs text-muted-foreground">Max</label>
          <Input
            type="number"
            value={question.validation?.max ?? ""}
            onChange={(e) => updateValidation({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="h-8 w-24"
          />
        </div>
      )}
      {(question.type === "text" || question.type === "longtext" || question.type === "url") && (
        <div className="pl-6 flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted-foreground">Max characters</label>
          <Input
            type="number"
            value={question.validation?.maxLength ?? ""}
            onChange={(e) => updateValidation({ maxLength: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="h-8 w-28"
          />
        </div>
      )}
      {question.type === "date" && (
        <div className="pl-6 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Switch
              checked={question.validation?.allowPast ?? true}
              onCheckedChange={(v) => updateValidation({ allowPast: v })}
            />
            <label>Allow past dates</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={question.validation?.allowFuture ?? true}
              onCheckedChange={(v) => updateValidation({ allowFuture: v })}
            />
            <label>Allow future dates</label>
          </div>
        </div>
      )}

      {/* Upload preview for file / support document */}
      {(question.type === "file" || question.type === "support_doc") && (
        <div className="pl-6">
          <label className="text-xs text-muted-foreground">
            {question.type === "support_doc" ? "Document upload" : "File upload"}
          </label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-secondary/30 px-3 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Click to upload or drag and drop (PDF, PNG, JPG up to 10MB)</span>
            </div>
            <Button variant="outline" size="sm" className="h-8" disabled>
              Choose file
            </Button>
          </div>
        </div>
      )}

      {/* Options for dropdown / radio / multiselect */}
      {(question.type === "dropdown" || question.type === "multiselect" || question.type === "radio") && (
        <div className="pl-6 space-y-2">
          <label className="text-xs text-muted-foreground">Options</label>
          <div className="flex flex-wrap gap-1.5">
            {(question.options ?? []).map((opt, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-secondary text-foreground px-2 py-1 text-xs">
                {opt}
                <button
                  onClick={() =>
                    onChange({
                      options: (question.options ?? []).filter((_, idx) => idx !== i),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={optInput}
            onChange={(e) => setOptInput(e.target.value)}
            placeholder="Type an option and press Enter…"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter" && optInput.trim()) {
                e.preventDefault();
                onChange({ options: [...(question.options ?? []), optInput.trim()] });
                setOptInput("");
              }
            }}
          />
        </div>
      )}

      {/* Dynamic table columns */}
      {question.type === "table" && (
        <div className="pl-6 space-y-2">
          <label className="text-xs text-muted-foreground font-medium">Table columns</label>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr>
                  {(question.columns ?? []).map((c, i) => (
                    <th key={i} className="px-2 py-1.5 text-left font-medium">{c.name || "Untitled"}</th>
                  ))}
                  <th className="px-2 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  {(question.columns ?? []).map((_, i) => (
                    <td key={i} className="px-2 py-2 text-muted-foreground italic">—</td>
                  ))}
                  <td className="px-2 py-2 text-muted-foreground"><X className="h-3 w-3" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-1.5">
            {(question.columns ?? []).map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={col.name}
                  onChange={(e) => updateColumn(i, { name: e.target.value })}
                  placeholder="Column name"
                  className="h-8 flex-1"
                />
                <Select value={col.type} onValueChange={(v) => updateColumn(i, { type: v as FieldType })}>
                  <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Switch checked={col.required} onCheckedChange={(v) => updateColumn(i, { required: v })} />
                  <span className="text-xs text-muted-foreground">Req</span>
                </div>
                <button
                  onClick={() => onChange({ columns: (question.columns ?? []).filter((_, idx) => idx !== i) })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ columns: [...(question.columns ?? []), { name: "", type: "text", required: false }] })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add column
            </Button>
          </div>
          <button className="text-xs text-blue-700 hover:underline">+ Add row (subject view)</button>
        </div>
      )}

      {/* Repeater indicator */}
      {question.repeater && (
        <div className="pl-6">
          <button className="text-xs text-blue-700 hover:underline">+ Add another</button>
        </div>
      )}

      {/* Same as toggle */}
      {question.sameAsToggleLabel && (
        <div className="pl-6 flex items-center gap-2 text-xs">
          <Switch />
          <label>{question.sameAsToggleLabel}</label>
        </div>
      )}

      {/* File upload attachment */}
      {question.attachUpload && (
        <div className="pl-6 text-xs text-muted-foreground italic">
          Upload trade license document (optional)
        </div>
      )}

      {question.note && (
        <div className="pl-6 text-xs text-muted-foreground italic">{question.note}</div>
      )}
    </div>
  );
}

