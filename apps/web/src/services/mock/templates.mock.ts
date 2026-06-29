import type { Template } from "@/types";
import templatesData from "@/mocks/data/templates.json";
import { delay } from "./utils";

let templatesCache: Template[] | null = null;

function getTemplates(): Template[] {
  if (!templatesCache) templatesCache = structuredClone(templatesData as Template[]);
  return templatesCache;
}

export interface TemplatesService {
  list(): Promise<Template[]>;
  getById(id: string): Promise<Template>;
  create(input: { name: string; recipientType: Template["recipientType"] }): Promise<Template>;
  save(template: Template): Promise<Template>;
  updateStatus(id: string, status: Template["status"]): Promise<Template>;
  delete(id: string): Promise<void>;
}

export const mockTemplatesService: TemplatesService = {
  async list() {
    await delay();
    return getTemplates().map(({ sections: _s, ...summary }) => ({
      ...summary,
      sections: [],
    }));
  },

  async getById(id) {
    await delay(150);
    const tpl = getTemplates().find((t) => t.id === id);
    if (!tpl) throw new Error("Template not found");
    return structuredClone(tpl);
  },

  async create({ name, recipientType }) {
    await delay(300);
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const created: Template = {
      id: `tpl-${Date.now()}`,
      name,
      recipientType,
      status: "Draft",
      lastEdited: today,
      editor: "David Chen",
      sections: [],
    };
    templatesCache = [...getTemplates(), created];
    return structuredClone(created);
  },

  async save(template) {
    await delay(400);
    const templates = getTemplates();
    const idx = templates.findIndex((t) => t.id === template.id);
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const saved = { ...template, lastEdited: today };
    if (idx === -1) {
      templatesCache = [...templates, saved];
    } else {
      templates[idx] = saved;
      templatesCache = templates;
    }
    return structuredClone(saved);
  },

  async updateStatus(id, status) {
    await delay(200);
    const templates = getTemplates();
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Template not found");
    templates[idx] = { ...templates[idx], status };
    templatesCache = templates;
    return structuredClone(templates[idx]);
  },

  async delete(id) {
    await delay(200);
    const tpl = getTemplates().find((t) => t.id === id);
    if (!tpl) throw new Error("Template not found");
    if (tpl.status !== "Draft") throw new Error("Only draft templates can be deleted");
    templatesCache = getTemplates().filter((t) => t.id !== id);
  },
};
