"use client";

import { useEffect, useState, useCallback } from "react";
import { getInboundRecords, getItems, getCategories, createInbound, createCategory, getApprovedRequisitions, quickInbound, type InboundRecord, type Item, type Requisition } from "@/lib/api";
import { IconPlus } from "@/lib/icons";

export default function InboundPage() {
  const [records, setRecords] = useState<InboundRecord[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"select" | "new" | "quick">("select");
  const [approvedReqs, setApprovedReqs] = useState<Requisition[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // 选择已有
  const [selItemId, setSelItemId] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [selPrice, setSelPrice] = useState("");
  const [selSupplier, setSelSupplier] = useState("");
  const [selNote, setSelNote] = useState("");

  // 手动添加
  const [newName, setNewName] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("个");
  const [newQty, setNewQty] = useState("1");
  const [newMinStock, setNewMinStock] = useState("0");
  const [newSupplier, setNewSupplier] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true); setError(""); setRecords(await getInboundRecords()); } catch (e) { setError(e instanceof Error ? e.message : "加载失败"); } finally { setLoading(false); }
  }, []);
  const loadMeta = useCallback(async () => {
    try { const [its, cats] = await Promise.all([getItems(), getCategories()]); setItems(its); setCategories(cats); } catch {}
  }, []);
  useEffect(() => { load(); loadMeta(); }, [load, loadMeta]);

  function reset() {
    setSelItemId(""); setSelQty("1"); setSelPrice(""); setSelSupplier(""); setSelNote("");
    setNewName(""); setNewCatId(""); setNewProject(""); setNewPrice(""); setNewUnit("个"); setNewQty("1"); setNewMinStock("0"); setNewSupplier(""); setNewNote("");
    setFormError(""); setMode("select"); setShowNewCat(false); setNewCatName("");
  }

  async function openQuickMode() {
    reset(); setMode("quick");
    try { setApprovedReqs(await getApprovedRequisitions()); } catch {}
  }

  async function handleQuickInbound(reqId: number) {
    try { setSubmitting(true);
      const res = await quickInbound(reqId);
      alert(`${res.item_name} +${res.quantity} 入库成功`);
      setShowForm(false); load(); loadMeta();
    } catch (e) { alert(e instanceof Error ? e.message : "快捷入库失败"); }
    finally { setSubmitting(false); }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try { const cat = await createCategory({ name: newCatName.trim() }); setCategories((p) => [...p, cat]); setNewCatId(String(cat.id)); setNewCatName(""); setShowNewCat(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : "添加失败"); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (mode === "select") {
      if (!selItemId) { setFormError("请选择耗材"); return; }
      try { setSubmitting(true);
        await createInbound({ item_id: Number(selItemId), quantity: Number(selQty), supplier_price: selPrice ? Number(selPrice) : undefined, supplier: selSupplier, operator: "", note: selNote });
        reset(); setShowForm(false); load(); loadMeta();
      } catch (e) { setFormError(e instanceof Error ? e.message : "入库失败"); }
      finally { setSubmitting(false); }
    } else {
      if (!newName.trim() || !newCatId) { setFormError("请填写名称和类别"); return; }
      try { setSubmitting(true);
        await createInbound({
          new_item_name: newName.trim(), new_item_category_id: Number(newCatId), new_item_project: newProject,
          new_item_price: newPrice ? Number(newPrice) : undefined, new_item_unit: newUnit,
          quantity: Number(newQty), supplier_price: newPrice ? Number(newPrice) : undefined,
          supplier: newSupplier, operator: "", note: newNote,
        });
        reset(); setShowForm(false); load(); loadMeta();
      } catch (e) { setFormError(e instanceof Error ? e.message : "入库失败"); }
      finally { setSubmitting(false); }
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div><h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>入库管理</h2><p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>操作人自动设为当前账号</p></div>
        <button className="hui-btn hui-btn-solid hui-btn-sm" onClick={() => { reset(); setShowForm(true); }}><IconPlus size={16} />新 增</button>
      </header>

      {error && <div role="alert" className="p-3 rounded-lg text-sm mb-4" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{error} <button className="underline ml-2" onClick={load}>重试</button></div>}

      {loading ? <div className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</div>
      : records.length === 0 ? <div className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无入库记录</div>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>耗材名称</th><th>数量</th><th>单价</th><th>供应商</th><th>操作人</th><th>备注</th><th>时间</th></tr></thead>
          <tbody>{records.map((r) => (<tr key={r.id}>
            <td className="font-medium text-sm">{r.item_name || `#${r.item_id}`}</td>
            <td><span className="hui-chip hui-chip-success">+{r.quantity}</span></td>
            <td className="text-sm">{r.price != null ? `¥${r.price.toFixed(2)}` : "-"}</td>
            <td className="text-sm">{r.supplier || "-"}</td>
            <td className="text-sm">{r.operator}</td>
            <td className="text-xs max-w-[160px] truncate" style={{ color: "var(--hui-text2)" }}>{r.note || "-"}</td>
            <td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
          </tr>))}</tbody>
        </table></div>
      )}

      {showForm && (
        <div className="hui-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true" aria-label="新增入库">
          <div className="hui-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">新增入库</h3>
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--hui-surface2)" }}>
              <button className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "select" ? "bg-white shadow-sm" : ""}`}
                style={{ color: mode === "select" ? "var(--hui-text)" : "var(--hui-text2)" }} onClick={() => { setFormError(""); setMode("select"); }} type="button">选择已有耗材</button>
              <button className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "new" ? "bg-white shadow-sm" : ""}`}
                style={{ color: mode === "new" ? "var(--hui-text)" : "var(--hui-text2)" }} onClick={() => { setFormError(""); setMode("new"); }} type="button">手动添加耗材</button>
              <button className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "quick" ? "bg-white shadow-sm" : ""}`}
                style={{ color: mode === "quick" ? "var(--hui-text)" : "var(--hui-text2)" }} onClick={() => { openQuickMode(); }} type="button">快捷入库</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {formError && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{formError}</div>}
              {mode === "select" ? (<>
                <div className="hui-input-wrap"><label>耗材 *</label><select className="hui-input hui-select" required value={selItemId} onChange={(e) => setSelItemId(e.target.value)}><option value="">请选择</option>{items.map((it) => (<option key={it.id} value={it.id}>{it.name} ({it.project || "无专案"}) 库存:{it.current_stock}{it.unit}</option>))}</select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="hui-input-wrap"><label>数量 *</label><input className="hui-input" type="number" min="0.01" step="0.01" required value={selQty} onChange={(e) => setSelQty(e.target.value)} /></div>
                  <div className="hui-input-wrap"><label>入库单价</label><input className="hui-input" type="number" min="0" step="0.01" value={selPrice} onChange={(e) => setSelPrice(e.target.value)} placeholder="留空同参考价" /></div>
                </div>
                <div className="hui-input-wrap"><label>供应商</label><input className="hui-input" value={selSupplier} onChange={(e) => setSelSupplier(e.target.value)} /></div>
                <div className="hui-input-wrap"><label>备注</label><textarea className="hui-input hui-textarea" rows={2} value={selNote} onChange={(e) => setSelNote(e.target.value)} /></div>
              </>) : (<>
                <div className="hui-input-wrap"><label>耗材名称 *</label><input className="hui-input" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="重复则自动阻止" /></div>
                {showNewCat ? (
                  <div className="flex gap-2 items-end"><div className="hui-input-wrap flex-1"><label>新类别</label><input className="hui-input" autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)} /></div><button className="hui-btn hui-btn-solid hui-btn-sm" type="button" onClick={handleAddCategory}>确定</button><button className="hui-btn hui-btn-ghost hui-btn-sm" type="button" onClick={() => setShowNewCat(false)}>取消</button></div>
                ) : (
                  <div className="flex gap-2 items-end"><div className="hui-input-wrap flex-1"><label>类别 *</label><select className="hui-input hui-select" required value={newCatId} onChange={(e) => setNewCatId(e.target.value)}><option value="">请选择</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div><button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" type="button" onClick={() => { setNewCatName(""); setShowNewCat(true); }}><IconPlus size={16} /></button></div>
                )}
                <div className="hui-input-wrap"><label>专案</label><input className="hui-input" value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="如 B482" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="hui-input-wrap"><label>单价</label><input className="hui-input" type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="可选" /></div>
                  <div className="hui-input-wrap"><label>单位</label><input className="hui-input" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="hui-input-wrap"><label>入库数量 *</label><input className="hui-input" type="number" min="0.01" step="0.01" required value={newQty} onChange={(e) => setNewQty(e.target.value)} /></div>
                  <div className="hui-input-wrap"><label>最低库存</label><input className="hui-input" type="number" min="0" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} /></div>
                </div>
                <div className="hui-input-wrap"><label>供应商</label><input className="hui-input" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} /></div>
                <div className="hui-input-wrap"><label>备注</label><textarea className="hui-input hui-textarea" rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)} /></div>
              </>)}
              {mode === "quick" && (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {approvedReqs.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: "var(--hui-text3)" }}>暂无已通过的请购单</p>
                  ) : (
                    approvedReqs.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--hui-border)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{r.item_name || r.new_item_name}</div>
                          <div className="text-xs" style={{ color: "var(--hui-text2)" }}>
                            ×{r.quantity}{r.new_item_unit} · 申请人:{r.requester_name}
                            {r.new_item_price != null && <span className="ml-2">¥{(r.new_item_price * r.quantity).toFixed(2)}</span>}
                          </div>
                        </div>
                        <button className="hui-btn hui-btn-solid hui-btn-sm shrink-0" onClick={() => handleQuickInbound(r.id)} disabled={submitting}>一键入库</button>
                      </div>
                    ))
                  )}
                </div>
              )}
              {mode !== "quick" && (
                <>
                  <p className="text-xs" style={{ color: "var(--hui-text3)" }}>操作人将自动记录为当前登录账号</p>
                  <div className="flex justify-end gap-2 mt-2">
                    <button className="hui-btn hui-btn-bordered hui-btn-sm" type="button" onClick={() => setShowForm(false)}>取消</button>
                    <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting}>{submitting ? "提交中..." : "确认入库"}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
