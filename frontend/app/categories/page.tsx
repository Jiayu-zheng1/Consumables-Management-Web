"use client";

import { useEffect, useState, useCallback } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { IconPlus, IconEdit, IconTrash } from "@/lib/icons";

export default function CategoriesPage() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [delTarget, setDelTarget] = useState<Category | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setCategories(await getCategories()); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setName(""); setDesc(""); setFormError(""); setShowForm(true); }
  function openEdit(c: Category) { setEditing(c); setName(c.name); setDesc(c.description); setFormError(""); setShowForm(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setFormError("请填写名称"); return; }
    try { setSubmitting(true); setFormError("");
      editing ? await updateCategory(editing.id, { name: name.trim(), description: desc }) : await createCategory({ name: name.trim(), description: desc });
      setShowForm(false); load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "操作失败"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try { await deleteCategory(delTarget.id); setShowDelete(false); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "删除失败"); }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div><h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>类别管理</h2><p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>可在新增耗材时快速创建</p></div>
        <button className="hui-btn hui-btn-solid hui-btn-sm" onClick={openCreate}><IconPlus size={16} />新 增</button>
      </header>

      {loading ? <div className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</div>
      : categories.length === 0 ? <div className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无类别</div>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>名称</th><th>描述</th><th>创建时间</th><th>操作</th></tr></thead>
          <tbody>{categories.map((c) => (<tr key={c.id}>
            <td className="font-medium">{c.name}</td>
            <td style={{ color: "var(--hui-text2)" }}>{c.description || "-"}</td>
            <td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(c.created_at).toLocaleString("zh-CN")}</td>
            <td><div className="flex gap-1">
              <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" onClick={() => openEdit(c)}><IconEdit size={15} /></button>
              {isAdmin && <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" onClick={() => { setDelTarget(c); setShowDelete(true); }} style={{ color: "var(--hui-danger)" }}><IconTrash size={15} /></button>}
            </div></td>
          </tr>))}</tbody>
        </table></div>
      )}

      {showForm && (
        <div className="hui-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true">
          <div className="hui-dialog" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">{editing ? "编辑类别" : "新增类别"}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {formError && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{formError}</div>}
              <div className="hui-input-wrap"><label>名称 *</label><input className="hui-input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="hui-input-wrap"><label>描述</label><textarea className="hui-input hui-textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="hui-btn hui-btn-bordered hui-btn-sm" type="button" onClick={() => setShowForm(false)}>取消</button>
                <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting}>{submitting ? "保存中..." : editing ? "保存" : "创建"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="hui-overlay" onClick={() => setShowDelete(false)}>
          <div className="hui-dialog" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">确认删除</h3>
            <p className="text-sm mb-5" style={{ color: "var(--hui-text2)" }}>确定删除类别「{delTarget?.name}」？</p>
            <div className="flex justify-end gap-2">
              <button className="hui-btn hui-btn-bordered hui-btn-sm" onClick={() => setShowDelete(false)}>取消</button>
              <button className="hui-btn hui-btn-danger hui-btn-sm" onClick={handleDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
