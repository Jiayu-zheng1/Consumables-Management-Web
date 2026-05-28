"use client";

import { useEffect, useState, useCallback } from "react";
import { IconPlus, IconTrash } from "@/lib/icons";
import { useAuth } from "@/lib/auth";
import {
  getItems, getCategories, getMyRequisitions, getRequisitionsToApprove,
  createRequisition, approveRequisition, createCategory,
  getRequisitionHistory, resubmitRequisition,
  type Item, type Requisition, type RequisitionCreate, type RequisitionItemCreate,
} from "@/lib/api";

const STATUS_MAP: Record<string, string> = {
  pending_section: "待课级审批", pending_department: "待部级审批",
  closed: "已结案", rejected: "已拒绝", fulfilled: "已入库",
};
const STATUS_COLOR: Record<string, string> = {
  pending_section: "hui-chip-warning", pending_department: "hui-chip-primary",
  closed: "hui-chip-success", rejected: "hui-chip-danger", fulfilled: "hui-chip-default",
};

type LineItem = {
  key: number;
  isNew: boolean;
  item_id: string;
  new_name: string; new_catId: string; new_project: string; new_price: string; new_unit: string; new_supplier: string;
  new_minStock: string; new_maxStock: string; new_desc: string;
  quantity: string;
};

let _lineKey = 0;
function newLine(): LineItem {
  return { key: ++_lineKey, isNew: false, item_id: "", new_name: "", new_catId: "", new_project: "", new_price: "", new_unit: "个", new_supplier: "", new_minStock: "0", new_maxStock: "0", new_desc: "", quantity: "1" };
}

export default function RequisitionsPage() {
  const { canApprove } = useAuth();
  const [tab, setTab] = useState<"my" | "approve" | "history">(canApprove ? "approve" : "my");
  const [myReqs, setMyReqs] = useState<Requisition[]>([]);
  const [pendingReqs, setPendingReqs] = useState<Requisition[]>([]);
  const [historyReqs, setHistoryReqs] = useState<Requisition[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [approveComment, setApproveComment] = useState<Record<number, string>>({});

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true);
      const [mr, pr] = await Promise.all([
        getMyRequisitions().catch(() => []),
        canApprove ? getRequisitionsToApprove().catch(() => []) : [],
      ]);
      setMyReqs(mr); setPendingReqs(pr as Requisition[]);
      if (canApprove) { getRequisitionHistory().then((h) => setHistoryReqs(h as Requisition[])).catch(() => {}); }
    } catch {} finally { setLoading(false); }
  }, [canApprove]);

  const loadMeta = useCallback(async () => {
    try { const [its, cats] = await Promise.all([getItems(), getCategories()]); setItems(its); setCategories(cats); } catch {}
  }, []);

  useEffect(() => { load(); loadMeta(); }, [load, loadMeta]);

  function resetForm() {
    setLines([newLine()]); setReason(""); setFormError(""); setFormMsg("");
    setShowNewCat(false); setNewCatName("");
  }

  function closeForm() { setShowForm(false); setResubmitId(null); resetForm(); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setFormMsg("");
    const payload: RequisitionCreate = { items: [], reason };
    for (const l of lines) {
      const qty = Number(l.quantity);
      if (!qty || qty < 1) continue;
      const ri: RequisitionItemCreate = { quantity: qty };
      if (!l.isNew) {
        if (!l.item_id) { setFormError("请为每行选择已有耗材或切换到新耗材"); return; }
        ri.item_id = Number(l.item_id);
      } else {
        if (!l.new_name.trim()) { setFormError("请为每行填写新耗材名称"); return; }
        ri.new_item_name = l.new_name.trim();
        ri.new_item_category_id = l.new_catId ? Number(l.new_catId) : undefined;
        ri.new_item_project = l.new_project;
        ri.new_item_price = l.new_price ? Number(l.new_price) : undefined;
        ri.new_item_unit = l.new_unit;
        ri.new_item_supplier = l.new_supplier;
        ri.new_item_min_stock = Number(l.new_minStock) || 0;
        ri.new_item_max_stock = Number(l.new_maxStock) || 0;
        ri.new_item_description = l.new_desc;
      }
      payload.items.push(ri);
    }
    if (payload.items.length === 0) { setFormError("请至少添加一个耗材"); return; }
    try { setSubmitting(true);
      const res = await createRequisition(payload);
      setFormMsg(res.message + " → " + res.status_label);
      setTimeout(() => { closeForm(); load(); }, 1000);
    } catch (e) { setFormError(e instanceof Error ? e.message : "创建失败"); }
    finally { setSubmitting(false); }
  }

  // 重新提交被拒请购
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitId, setResubmitId] = useState<number | null>(null);

  function openResubmit(r: Requisition) {
    setResubmitId(r.id);
    setShowForm(true);
    setReason(r.reason || "");
    const riList = r.items || [];
    if (riList.length > 0) {
      setLines(riList.map((ri) => ({
        key: ++_lineKey, isNew: !ri.item_id,
        item_id: ri.item_id ? String(ri.item_id) : "",
        new_name: ri.new_item_name || "", new_catId: ri.new_item_category_id ? String(ri.new_item_category_id) : "",
        new_project: ri.new_item_project || "", new_price: ri.new_item_price != null ? String(ri.new_item_price) : "",
        new_unit: ri.new_item_unit || "个", new_supplier: ri.new_item_supplier || "",
        new_minStock: String((ri as any).new_item_min_stock || 0),
        new_maxStock: String((ri as any).new_item_max_stock || 0),
        new_desc: (ri as any).new_item_description || "",
        quantity: String(ri.quantity),
      })));
    } else {
      setLines([newLine()]);
    }
  }

  async function handleResubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setFormMsg("");
    if (resubmitId == null) return;
    const payload: RequisitionCreate = { items: [], reason };
    for (const l of lines) {
      const qty = Number(l.quantity);
      if (!qty || qty < 1) continue;
      const ri: RequisitionItemCreate = { quantity: qty };
      if (!l.isNew) {
        if (!l.item_id) { setFormError("请为每行选择已有耗材或切换到新耗材"); return; }
        ri.item_id = Number(l.item_id);
      } else {
        if (!l.new_name.trim()) { setFormError("请为每行填写新耗材名称"); return; }
        ri.new_item_name = l.new_name.trim();
        ri.new_item_category_id = l.new_catId ? Number(l.new_catId) : undefined;
        ri.new_item_project = l.new_project;
        ri.new_item_price = l.new_price ? Number(l.new_price) : undefined;
        ri.new_item_unit = l.new_unit;
        ri.new_item_supplier = l.new_supplier;
        ri.new_item_min_stock = Number(l.new_minStock) || 0;
        ri.new_item_max_stock = Number(l.new_maxStock) || 0;
        ri.new_item_description = l.new_desc;
      }
      payload.items.push(ri);
    }
    if (payload.items.length === 0) { setFormError("请至少添加一个耗材"); return; }
    try { setResubmitting(true);
      const res = await resubmitRequisition(resubmitId, payload);
      setFormMsg(res.message + " → " + res.status_label);
      setTimeout(() => { closeForm(); load(); }, 1000);
    } catch (e) { setFormError(e instanceof Error ? e.message : "重新提交失败"); }
    finally { setResubmitting(false); }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try { const cat = await createCategory({ name: newCatName.trim() }); setCategories((p) => [...p, cat]); setNewCatName(""); setShowNewCat(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : "添加失败"); }
  }

  async function handleApprove(reqId: number, action: "approve" | "reject") {
    try {
      const res = await approveRequisition(reqId, action, approveComment[reqId] || "");
      setApproveComment((p) => { const n = { ...p }; delete n[reqId]; return n; });
      alert(res.message + " → " + res.status_label); load(); (window as any).__refreshCount?.();
    } catch (e) { alert(e instanceof Error ? e.message : "审批失败"); }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="accent-bar accent-bar-warning"><h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--hui-text)" }}>请购管理</h2><p className="text-xs mt-0.5 uppercase tracking-wider font-semibold" style={{ color: "var(--hui-text3)" }}>耗材请购·审批·记录</p></div>
        <button className="hui-btn hui-btn-solid hui-btn-sm" onClick={() => { setResubmitId(null); resetForm(); setShowForm(true); }}><IconPlus size={16} />新建请购</button>
      </header>

      <div className="hui-tabs mb-4">
        {canApprove && <button className={`hui-tab ${tab === "approve" ? "active" : ""}`} onClick={() => setTab("approve")}>待审批</button>}
        <button className={`hui-tab ${tab === "my" ? "active" : ""}`} onClick={() => setTab("my")}>我的请购</button>
        {canApprove && <button className={`hui-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>历史记录</button>}
      </div>

      {tab === "approve" && <ApproveTab loading={loading} reqs={pendingReqs} comment={approveComment} setComment={setApproveComment} onApprove={handleApprove} />}
      {tab === "my" && <ReqList loading={loading} reqs={myReqs} empty="暂无请购记录" onResubmit={openResubmit} />}
      {tab === "history" && <ReqList loading={loading} reqs={historyReqs} empty="暂无历史记录" showDetail />}

      {showForm && (
        <div className="hui-overlay" onClick={closeForm} role="dialog" aria-modal="true">
          <div className="hui-dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">{resubmitId ? "重新提交请购" : "新建请购"}</h3>
            <form onSubmit={resubmitId ? handleResubmit : handleCreate} className="flex flex-col gap-3">
              {formError && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{formError}</div>}
              {formMsg && <div role="status" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-success-light)", color: "var(--hui-success)" }}>{formMsg}</div>}

              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto">
                {lines.map((l, idx) => (
                  <div key={l.key} className="p-3 rounded-lg border" style={{ borderColor: "var(--hui-border)", background: "var(--hui-surface)" }}>
                    <div className="flex items-center gap-1 mb-2">
                      <button type="button" className={`flex-1 py-1 text-xs font-medium rounded ${!l.isNew ? "text-white" : ""}`}
                        style={{ background: !l.isNew ? "var(--hui-primary)" : "var(--hui-surface2)", color: !l.isNew ? "#fff" : "var(--hui-text2)" }}
                        onClick={() => { const nl = [...lines]; nl[idx] = { ...l, isNew: false }; setLines(nl); }}
                      >已有耗材</button>
                      <button type="button" className={`flex-1 py-1 text-xs font-medium rounded ${l.isNew ? "text-white" : ""}`}
                        style={{ background: l.isNew ? "var(--hui-primary)" : "var(--hui-surface2)", color: l.isNew ? "#fff" : "var(--hui-text2)" }}
                        onClick={() => { const nl = [...lines]; nl[idx] = { ...l, isNew: true }; setLines(nl); }}
                      >新耗材</button>
                      {lines.length > 1 && (
                        <button type="button" className="p-1 rounded hover:opacity-70" style={{ color: "var(--hui-danger)" }}
                          onClick={() => { const nl = lines.filter((_, i) => i !== idx); setLines(nl.length === 0 ? [newLine()] : nl); }}
                        ><IconTrash size={14} /></button>
                      )}
                    </div>

                    {!l.isNew ? (
                      <div className="flex flex-col gap-2">
                        <select className="hui-input hui-select" style={{ fontSize: 12, height: 30 }} value={l.item_id}
                          onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, item_id: e.target.value }; setLines(nl); }}
                        >
                          <option value="">选择已有耗材</option>
                          {items.map((it) => (<option key={it.id} value={it.id}>{it.name} ({it.project || "-"}) {it.supplier ? ` ${it.supplier}` : ""}</option>))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="hui-input-wrap"><label className="text-[10px]">数量</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} type="number" min="1" value={l.quantity} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, quantity: e.target.value }; setLines(nl); }} /></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input className="hui-input" style={{ height: 30, fontSize: 12 }} placeholder="新耗材名称 *" value={l.new_name}
                          onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_name: e.target.value }; setLines(nl); }}
                        />
                        {showNewCat ? (
                          <div className="flex gap-2 items-end">
                            <input className="hui-input flex-1" style={{ height: 30, fontSize: 12 }} autoFocus placeholder="新类别名称" value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                            />
                            <button className="hui-btn hui-btn-solid hui-btn-sm" type="button" onClick={handleAddCategory}>确定</button>
                            <button className="hui-btn hui-btn-ghost hui-btn-sm" type="button" onClick={() => setShowNewCat(false)}>取消</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-end">
                            <select className="hui-input hui-select flex-1" style={{ height: 30, fontSize: 12 }} value={l.new_catId}
                              onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_catId: e.target.value }; setLines(nl); }}
                            ><option value="">选择分类</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
                            <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" type="button" onClick={() => { setNewCatName(""); setShowNewCat(true); }}><IconPlus size={16} /></button>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="hui-input-wrap"><label className="text-[10px]">数量</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} type="number" min="1" value={l.quantity} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, quantity: e.target.value }; setLines(nl); }} /></div>
                          <div className="hui-input-wrap"><label className="text-[10px]">单价 ¥</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} type="number" min="0" step="0.01" value={l.new_price} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_price: e.target.value }; setLines(nl); }} /></div>
                          <div className="hui-input-wrap"><label className="text-[10px]">单位</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} value={l.new_unit} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_unit: e.target.value }; setLines(nl); }} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="hui-input-wrap"><label className="text-[10px]">专案</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} placeholder="如 B482" value={l.new_project} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_project: e.target.value }; setLines(nl); }} /></div>
                          <div className="hui-input-wrap"><label className="text-[10px]">供应商</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} value={l.new_supplier} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_supplier: e.target.value }; setLines(nl); }} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="hui-input-wrap"><label className="text-[10px]">最低库存</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} type="number" min="0" value={l.new_minStock} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_minStock: e.target.value }; setLines(nl); }} /></div>
                          <div className="hui-input-wrap"><label className="text-[10px]">最高库存</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} type="number" min="0" value={l.new_maxStock} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_maxStock: e.target.value }; setLines(nl); }} /></div>
                        </div>
                        <div className="hui-input-wrap"><label className="text-[10px]">描述</label><input className="hui-input" style={{ height: 30, fontSize: 12 }} placeholder="规格/型号说明" value={l.new_desc} onChange={(e) => { const nl = [...lines]; nl[idx] = { ...l, new_desc: e.target.value }; setLines(nl); }} /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" className="hui-btn hui-btn-ghost hui-btn-sm self-start text-xs" onClick={() => setLines([...lines, newLine()])}>
                <IconPlus size={14} /> 添加耗材
              </button>

              <div className="hui-input-wrap"><label>申请理由</label><input className="hui-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="用途说明" /></div>

              <div className="flex justify-end gap-2 mt-2">
                <button className="hui-btn hui-btn-bordered hui-btn-sm" type="button" onClick={closeForm}>取消</button>
                <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting || resubmitting}>
                  {resubmitting ? "重新提交中..." : submitting ? "提交中..." : resubmitId ? "重新提交" : "提交请购"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function ApproveTab({ loading, reqs, comment, setComment, onApprove }: {
  loading: boolean; reqs: Requisition[];
  comment: Record<number, string>; setComment: (v: Record<number, string>) => void;
  onApprove: (id: number, action: "approve" | "reject") => void;
}) {
  if (loading) return <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>;
  if (reqs.length === 0) return <p className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无待审批请购</p>;
  return (
    <div className="flex flex-col gap-3">
      {reqs.map((r) => {
        const riList = r.items || [];
        const fallback = riList.length === 0 ? [{ item_name: r.item_name || r.new_item_name, new_item_unit: r.new_item_unit, new_item_price: r.new_item_price, quantity: r.quantity, new_item_supplier: r.new_item_supplier }] : riList;
        const totalAmt = fallback.reduce((s: number, it: any) => s + (it.new_item_price || 0) * it.quantity, 0);
        return (
          <div key={r.id} className="hui-card flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{r.req_no || `#${r.id}`}</span>
                  <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{r.requester_name}</span>
                  <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                </div>
                {fallback.map((it: any, i: number) => {
                  const lineAmt = (it.new_item_price || 0) * it.quantity;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                      <span className="font-medium" style={{ color: "var(--hui-text)" }}>{it.item_name || it.new_item_name}</span>
                      <span style={{ color: "var(--hui-text2)" }}>×{it.quantity}{it.new_item_unit}</span>
                      {it.new_item_price != null && <span style={{ color: "var(--hui-text2)" }}>¥{it.new_item_price.toFixed(2)}</span>}
                      {lineAmt > 0 && <span className="font-medium" style={{ color: "var(--hui-primary)" }}>¥{lineAmt.toFixed(2)}</span>}
                    </div>
                  );
                })}
                {fallback.length > 1 && (
                  <div className="text-xs mt-1 font-bold" style={{ color: "var(--hui-primary)" }}>合计: ¥{totalAmt.toFixed(2)}</div>
                )}
                {r.reason && <div className="text-xs mt-1" style={{ color: "var(--hui-text3)" }}>理由: {r.reason}</div>}
                {r.section_comment && <div className="text-xs mt-1" style={{ color: "var(--hui-primary)" }}>课级意见: {r.section_comment}</div>}
              </div>
              <span className={`hui-chip ${STATUS_COLOR[r.status] || ""}`}>{STATUS_MAP[r.status] || r.status}</span>
            </div>
            <div className="flex gap-2 items-end">
              <input className="hui-input flex-1" style={{ height: 32, fontSize: 12 }} placeholder="审批意见" value={comment[r.id] || ""} onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} />
              <button className="hui-btn hui-btn-solid hui-btn-sm" style={{ background: "var(--hui-success)" }} onClick={() => onApprove(r.id, "approve")}>通过</button>
              <button className="hui-btn hui-btn-danger hui-btn-sm" onClick={() => onApprove(r.id, "reject")}>拒绝</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReqList({ loading, reqs, empty, showDetail, onResubmit }: { loading: boolean; reqs: Requisition[]; empty: string; showDetail?: boolean; onResubmit?: (r: Requisition) => void }) {
  if (loading) return <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>;
  if (reqs.length === 0) return <p className="text-center py-16" style={{ color: "var(--hui-text3)" }}>{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {reqs.map((r) => {
        const riList = r.items || [];
        const fallback = riList.length === 0 ? [{ item_name: r.item_name || r.new_item_name, new_item_unit: r.new_item_unit, new_item_price: r.new_item_price, quantity: r.quantity, new_item_supplier: r.new_item_supplier }] : riList;
        const totalAmt = fallback.reduce((s, it: any) => s + (it.new_item_price || 0) * it.quantity, 0);
        return (
          <div key={r.id} className="hui-card flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{r.req_no || `#${r.id}`}</span>
                <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</span>
              </div>
              {fallback.map((it: any, i: number) => {
                const lineAmt = (it.new_item_price || 0) * it.quantity;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                    <span className="font-medium" style={{ color: "var(--hui-text)" }}>{it.item_name || it.new_item_name}</span>
                    <span style={{ color: "var(--hui-text2)" }}>×{it.quantity}{it.new_item_unit}</span>
                    {it.new_item_price != null && <span style={{ color: "var(--hui-text2)" }}>¥{it.new_item_price.toFixed(2)}</span>}
                    {lineAmt > 0 && <span className="font-medium" style={{ color: "var(--hui-primary)" }}>¥{lineAmt.toFixed(2)}</span>}
                                      </div>
                );
              })}
              {fallback.length > 1 && (
                <div className="text-xs mt-1 font-bold" style={{ color: "var(--hui-primary)" }}>合计: ¥{totalAmt.toFixed(2)}</div>
              )}
              {r.reason && <div className="text-xs mt-1" style={{ color: "var(--hui-text3)" }}>理由: {r.reason}</div>}
              {showDetail && r.section_comment && <div className="text-xs mt-1" style={{ color: "var(--hui-primary)" }}>课级审批: {r.section_comment}</div>}
              {showDetail && r.department_comment && <div className="text-xs mt-0.5" style={{ color: "var(--hui-success)" }}>部级审批: {r.department_comment}</div>}
              {r.status === "rejected" && (
                <div className="text-xs mt-1" style={{ color: "var(--hui-danger)" }}>已拒绝{ r.section_comment ? ` — 课级: ${r.section_comment}` : "" }{ r.department_comment ? ` — 部级: ${r.department_comment}` : "" }</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onResubmit && r.status === "rejected" && (
                <button className="hui-btn hui-btn-solid hui-btn-sm" style={{ height: 26, fontSize: 11, padding: "0 8px" }} onClick={() => onResubmit(r)}>重新提交</button>
              )}
              <span className={`hui-chip ${STATUS_COLOR[r.status] || ""}`}>{STATUS_MAP[r.status] || r.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
