"use client";

import { useEffect, useState, useCallback } from "react";
import { getItems, getCategories, getProjects, createItem, createCategory, updateItem, deleteItem, type Item, type ItemCreate, type ItemUpdate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { IconPlus, IconEdit, IconTrash } from "@/lib/icons";

export default function ItemsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: "", category_id: "", project: "", price: "", unit: "个", min_stock: "0", max_stock: "0", current_stock: "0", supplier: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [delTarget, setDelTarget] = useState<Item | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setError("");
      setItems(await getItems({ search, category_id: catFilter ? Number(catFilter) : undefined, project: projectFilter, low_stock: lowStockOnly }));
    } catch (e) { setError(e instanceof Error ? e.message : "加载失败"); }
    finally { setLoading(false); }
  }, [search, catFilter, projectFilter, lowStockOnly]);

  const loadMeta = useCallback(async () => {
    try { const [c, p] = await Promise.all([getCategories(), getProjects()]); setCategories(c); setProjects(p); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  function openCreate() {
    setEditing(null); setForm({ name: "", category_id: "", project: "", price: "", unit: "个", min_stock: "0", max_stock: "0", current_stock: "0", supplier: "", description: "" });
    setFormError(""); setNewCatName(""); setShowNewCat(false); setShowForm(true);
  }
  function openEdit(item: Item) {
    setEditing(item); setForm({ name: item.name, category_id: String(item.category_id), project: item.project, price: item.price != null ? String(item.price) : "", unit: item.unit, min_stock: String(item.min_stock), max_stock: String(item.max_stock), current_stock: String(item.current_stock), supplier: item.supplier || "", description: item.description });
    setFormError(""); setNewCatName(""); setShowNewCat(false); setShowForm(true);
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try { const cat = await createCategory({ name: newCatName.trim() }); setCategories((p) => [...p, cat]); setForm((f) => ({ ...f, category_id: String(cat.id) })); setNewCatName(""); setShowNewCat(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : "添加失败"); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.category_id) { setFormError("请填写名称和类别"); return; }
    try { setSubmitting(true); setFormError("");
      const d = { ...form, category_id: Number(form.category_id), min_stock: Number(form.min_stock), max_stock: Number(form.max_stock), current_stock: Number(form.current_stock), price: form.price ? Number(form.price) : undefined };
      editing ? await updateItem(editing.id, d as ItemUpdate) : await createItem(d as unknown as ItemCreate);
      setShowForm(false); load(); loadMeta();
    } catch (e) { setFormError(e instanceof Error ? e.message : "操作失败"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try { await deleteItem(delTarget.id); setShowDelete(false); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "删除失败"); }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="accent-bar"><h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--hui-text)" }}>耗材管理</h2><p className="text-xs mt-0.5 uppercase tracking-wider font-semibold" style={{ color: "var(--hui-text3)" }}>共 {items.length} 项</p></div>
        <button className="hui-btn hui-btn-solid hui-btn-sm" onClick={openCreate}><IconPlus size={16} />新 增</button>
      </header>

      {error && <div role="alert" className="p-3 rounded-lg text-sm mb-4" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{error} <button className="underline ml-2" onClick={load}>重试</button></div>}

      <div className="hui-card mb-4 p-3 flex flex-wrap gap-3 items-end">
        <div className="hui-input-wrap flex-1 min-w-[160px]"><label>搜索</label><input className="hui-input hui-input-sm" style={{ height: 32 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="名称..." /></div>
        <div className="hui-input-wrap min-w-[120px]"><label>类别</label><select className="hui-input hui-select hui-input-sm" style={{ height: 32 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}><option value="">全部</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
        <div className="hui-input-wrap min-w-[120px]"><label>专案</label><select className="hui-input hui-select hui-input-sm" style={{ height: 32 }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}><option value="">全部</option>{projects.map((p) => (<option key={p} value={p}>{p}</option>))}</select></div>
        <button className={`hui-btn hui-btn-sm ${lowStockOnly ? "hui-btn-light" : "hui-btn-bordered"}`} style={{ marginBottom: 0, height: 32 }} onClick={() => setLowStockOnly(!lowStockOnly)}>仅预警</button>
      </div>

      {loading ? <div className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</div>
      : items.length === 0 ? <div className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无耗材，点击右上角「新增」开始</div>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>名称</th><th>类别</th><th>专案</th><th>供应商</th><th>单价</th><th>单位</th><th>库存</th><th>最低</th><th>最高</th><th>操作</th></tr></thead>
          <tbody>
            {items.map((item) => (<tr key={item.id}>
              <td className="font-medium">{item.name}</td>
              <td><span className="hui-chip hui-chip-primary">{item.category?.name || "-"}</span></td>
              <td>{item.project || <span style={{ color: "var(--hui-text3)" }}>-</span>}</td>
              <td className="text-xs max-w-[100px] truncate" title={item.supplier}>{item.supplier || "-"}</td>
              <td style={{ color: "var(--hui-text2)" }}>{item.price != null ? `¥${item.price.toFixed(2)}` : "-"}</td>
              <td style={{ color: "var(--hui-text2)" }}>{item.unit}</td>
              <td><span className={`hui-chip ${item.current_stock <= item.min_stock ? "hui-chip-danger" : "hui-chip-success"}`}>{item.current_stock}</span></td>
              <td style={{ color: "var(--hui-text2)" }}>{item.min_stock}</td>
              <td style={{ color: "var(--hui-text2)" }}>{item.max_stock > 0 ? item.max_stock : "-"}</td>
              <td><div className="flex gap-1">
                <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" onClick={() => openEdit(item)}><IconEdit size={15} /></button>
                {isAdmin && <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" onClick={() => { setDelTarget(item); setShowDelete(true); }} style={{ color: "var(--hui-danger)" }}><IconTrash size={15} /></button>}
              </div></td>
            </tr>))}
          </tbody>
        </table></div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <div className="hui-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true" aria-label={editing ? "编辑耗材" : "新增耗材"}>
          <div className="hui-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">{editing ? "编辑耗材" : "新增耗材"}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {formError && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{formError}</div>}
              <div className="hui-input-wrap"><label>名称 *</label><input className="hui-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              {showNewCat ? (
                <div className="flex gap-2 items-end">
                  <div className="hui-input-wrap flex-1"><label>新类别</label><input className="hui-input" autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)} /></div>
                  <button className="hui-btn hui-btn-solid hui-btn-sm" type="button" onClick={handleAddCategory}>确定</button>
                  <button className="hui-btn hui-btn-ghost hui-btn-sm" type="button" onClick={() => setShowNewCat(false)}>取消</button>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="hui-input-wrap flex-1"><label>类别 *</label><select className="hui-input hui-select" required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">请选择</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                  <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" type="button" onClick={() => { setNewCatName(""); setShowNewCat(true); }}><IconPlus size={16} /></button>
                </div>
              )}
              <div className="hui-input-wrap"><label>专案</label><input className="hui-input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="如 B482" list="pj-list" /><datalist id="pj-list">{projects.map((p) => (<option key={p} value={p} />))}</datalist></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="hui-input-wrap"><label>单价</label><input className="hui-input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="参考单价" /></div>
                <div className="hui-input-wrap"><label>单位</label><input className="hui-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              </div>
              <div className="hui-input-wrap"><label>供应商</label><input className="hui-input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="默认供应商" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="hui-input-wrap"><label>最低库存</label><input className="hui-input" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
                <div className="hui-input-wrap"><label>最高库存</label><input className="hui-input" type="number" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} /></div>
                <div className="hui-input-wrap"><label>当前库存</label><input className="hui-input" type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} disabled={!!editing} title={editing ? "库存只能通过出入库操作变更" : "初始库存"} /></div>
              </div>
              <div className="hui-input-wrap"><label>描述</label><textarea className="hui-input hui-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="hui-btn hui-btn-bordered hui-btn-sm" type="button" onClick={() => setShowForm(false)}>取消</button>
                <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting}>{submitting ? "保存中..." : editing ? "保存" : "创建"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDelete && (
        <div className="hui-overlay" onClick={() => setShowDelete(false)}>
          <div className="hui-dialog" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">确认删除</h3>
            <p className="text-sm mb-5" style={{ color: "var(--hui-text2)" }}>确定删除「{delTarget?.name}」？</p>
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
