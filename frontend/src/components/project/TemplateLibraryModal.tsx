import { useState } from 'react';

interface TemplateItem {
  id: string;
  name: string;
  category?: string;
  shared?: boolean;
  sectionName: string;
  ownerId: string;
  owner?: { email?: string };
}

interface TemplateLibraryModalProps {
  open: boolean;
  onClose: () => void;
  templates: TemplateItem[];
  selectedTemplates: Set<string>;
  toggleSelection: (id: string) => void;
  bulkAction: '' | 'share' | 'unshare' | 'delete';
  setBulkAction: (value: '' | 'share' | 'unshare' | 'delete') => void;
  executeBulkAction: () => void;
  updateTemplate: (payload: { templateId: string; updates: { name?: string; category?: string; shared?: boolean } }) => void;
  deleteTemplate: (templateId: string) => void;
  userId?: string;
}

const TemplateLibraryModal = ({
  open,
  onClose,
  templates,
  selectedTemplates,
  toggleSelection,
  bulkAction,
  setBulkAction,
  executeBulkAction,
  updateTemplate,
  deleteTemplate,
  userId,
}: TemplateLibraryModalProps) => {
  const [edits, setEdits] = useState<Record<string, Partial<{ name: string; category: string; shared: boolean }>>>({});

  const handleClose = () => {
    setEdits({});
    onClose();
  };

  if (!open) return null;

  const handleSave = (id: string, template: TemplateItem) => {
    const pending = edits[id] ?? {};
    const updates = {
      name: pending.name ?? template.name,
      category: pending.category ?? template.category ?? '',
      shared: pending.shared ?? template.shared ?? false,
    };
    updateTemplate({ templateId: id, updates });
  };

  const isOwner = (ownerId: string) => ownerId === userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Template library</h2>
            <button
              type="button"
              onClick={handleClose}
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-auto">
          {templates.length ? (
            templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.has(template.id)}
                    onChange={() => toggleSelection(template.id)}
                    className="h-4 w-4 text-sky-600"
                  />
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{template.name}</p>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        {template.sectionName}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    value={edits[template.id]?.name ?? template.name}
                    onChange={(event) =>
                      setEdits((prev) => ({
                        ...prev,
                        [template.id]: {
                          ...(prev[template.id] ?? {}),
                          name: event.target.value,
                        },
                      }))
                    }
                    disabled={!isOwner(template.ownerId)}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                  />
                  <input
                    value={edits[template.id]?.category ?? template.category ?? ''}
                    onChange={(event) =>
                      setEdits((prev) => ({
                        ...prev,
                        [template.id]: {
                          ...(prev[template.id] ?? {}),
                          category: event.target.value,
                        },
                      }))
                    }
                    disabled={!isOwner(template.ownerId)}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={
                        edits[template.id]?.shared ??
                        (template.shared ?? false)
                      }
                      onChange={(event) =>
                        setEdits((prev) => ({
                          ...prev,
                          [template.id]: {
                            ...(prev[template.id] ?? {}),
                            shared: event.target.checked,
                          },
                        }))
                      }
                      disabled={!isOwner(template.ownerId)}
                      className="h-3 w-3"
                    />
                    Shared
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                {isOwner(template.ownerId)
                  ? 'Owned by you'
                  : `Shared by ${template.owner?.email ?? 'someone'}`}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(template.id, template)}
                      disabled={!isOwner(template.ownerId)}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(template.id)}
                      disabled={!isOwner(template.ownerId)}
                      className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No templates yet.</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as '' | 'share' | 'unshare' | 'delete')}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Bulk action</option>
            <option value="share">Share</option>
            <option value="unshare">Unshare</option>
            <option value="delete">Delete</option>
          </select>
          <button
            type="button"
            onClick={executeBulkAction}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibraryModal;
