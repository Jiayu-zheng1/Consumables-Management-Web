"use client";

import { useEffect, useState, useCallback } from "react";
import { getOutboundRecords, getItems, createOutbound, type OutboundRecord, type Item } from "@/lib/api";
import { IconPlus } from "@/lib/icons";

export default function OutboundPage() {
  const [records, setRecords] = useState<OutboundRecord[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: "1", department: "", operator: "", purpose: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true); setError(""); setRecords(await getOutboundRecords()); }
    catch (e) { setError(e instanceof Error ? e.message : "加载失败"); }
    finally { setLoading(false); }
  }, []);
  const loadItems = useCallback(async () => { try { setItems(await getItems()); } catch {} }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.operator.trim()) { setFormError("请填写操作人"); return; }
    if (!form.item_id) { setFormError("请选择耗材"); return; }
    try { setSubmitting(true); setFormError("");
      await createOutbound({ item_id: Number(form.item_id), quantity: Number(form.quantity), department: form.department, operator: form.operator, purpose: form.purpose, note: form.note });
      setShowForm(false); load(); loadItems();
    } catch (e) { setFormError(e instanceof Error ? e.message : "操作失败"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div><h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>出库管理</h2><p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>库存自动扣减</p></div>
        <button className="hui-btn hui-btn-solid hui-btn-sm" onClick={() => setShowForm(true)}><IconPlus size={16} />新 增</button>
      </header>

      {error && <div role="alert" className="p-3 rounded-lg text-sm mb-4" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{error} <button className="underline ml-2" onClick={load}>重试</button></div>}

      {loading ? <div className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</div>
      : records.length === 0 ? <div className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无出库记录</div>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>耗材名称</th><th>数量</th><th>部门</th><th>操作人</th><th>用途</th><th>备注</th><th>时间</th></tr></thead>
          <tbody>{records.map((r) => (<tr key={r.id}>
            <td className="font-medium text-sm">{r.item_name || `#${r.item_id}`}</td>
            <td><span className="hui-chip hui-chip-primary">-{r.quantity}</span></td>
            <td>{r.department || "-"}</td>
            <td>{r.operator}</td>
            <td>{r.purpose || "-"}</td>
            <td className="text-xs max-w-[160px] truncate" style={{ color: "var(--hui-text2)" }}>{r.note || "-"}</td>
            <td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
          </tr>))}</tbody>
        </table></div>
      )}

      {showForm && (
        <div className="hui-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true" aria-label="新增出库">
          <div className="hui-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">新增出库</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {formError && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{formError}</div>}
              <div className="hui-input-wrap"><label>耗材 *</label><select className="hui-input hui-select" required value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}><option value="">请选择</option>{items.map((item) => (<option key={item.id} value={item.id}>{item.name} (库存: {item.current_stock} {item.unit})</option>))}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="hui-input-wrap"><label>数量 *</label><input className="hui-input" type="number" min="0.01" step="0.01" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div className="hui-input-wrap"><label>部门</label><input className="hui-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              </div>
              <div className="hui-input-wrap"><label>操作人 *</label><input className="hui-input" required value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} /></div>
              <div className="hui-input-wrap"><label>用途</label><input className="hui-input" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
              <div className="hui-input-wrap"><label>备注</label><textarea className="hui-input hui-textarea" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="hui-btn hui-btn-bordered hui-btn-sm" type="button" onClick={() => setShowForm(false)}>取消</button>
                <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting}>{submitting ? "提交中..." : "确认出库"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
