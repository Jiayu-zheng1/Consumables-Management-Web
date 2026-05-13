"use client";

import { useEffect, useState, useCallback } from "react";
import { IconPlus } from "@/lib/icons";
import { useAuth } from "@/lib/auth";
import {
  getItems, getCategories, getMyRequisitions, getRequisitionsToApprove,
  createRequisition, approveRequisition, createCategory,
  getRequisitionHistory,
  type Item, type Requisition,
} from "@/lib/api";

const STATUS_MAP: Record<string, string> = {
  pending_section: "待课级审批", pending_department: "待部级审批",
  closed: "已结案", rejected: "已拒绝", fulfilled: "已入库",
};
const STATUS_COLOR: Record<string, string> = {
  pending_section: "hui-chip-warning", pending_department: "hui-chip-primary",
  closed: "hui-chip-success", rejected: "hui-chip-danger", fulfilled: "hui-chip-default",
};

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

  const [mode, setMode] = useState<"select" | "new">("select");
  const [selItemId, setSelItemId] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [selReason, setSelReason] = useState("");
  const [newName, setNewName] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("个");
  const [newSupplier, setNewSupplier] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newReason, setNewReason] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [approveComment, setApproveComment] = useState<Record<number, string>>({});

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setFormMsg("");
    try { setSubmitting(true);
      const data: Record<string, unknown> = { quantity: Number(mode === "select" ? selQty : newQty), reason: mode === "select" ? selReason : newReason };
      if (mode === "select") { data.item_id = Number(selItemId); }
      else { data.new_item_name = newName; data.new_item_category_id = newCatId ? Number(newCatId) : undefined; data.new_item_project = newProject; data.new_item_price = newPrice ? Number(newPrice) : undefined; data.new_item_unit = newUnit; data.new_item_supplier = newSupplier; }
      const res = await createRequisition(data as any);
      setFormMsg(res.message + " → " + res.status_label);
      setTimeout(() => { setShowForm(false); load(); }, 1000);
    } catch (e) { setFormError(e instanceof Error ? e.message : "创建失败"); }
    finally { setSubmitting(false); }
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
        <div><h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>请购管理</h2><p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>耗材请购·审批·记录</p></div>
        <button className="hui-btn hui-btn-solid hui-btn-sm" onClick={() => setShowForm(true)}><IconPlus size={16} />新建请购</button>
      </header>

      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--hui-surface2)" }}>
        {canApprove && <TabBtn active={tab === "approve"} onClick={() => setTab("approve")}>待审批</TabBtn>}
        <TabBtn active={tab === "my"} onClick={() => setTab("my")}>我的请购</TabBtn>
        {canApprove && <TabBtn active={tab === "history"} onClick={() => setTab("history")}>历史记录</TabBtn>}
      </div>

      {tab === "approve" && <ApproveTab loading={loading} reqs={pendingReqs} comment={approveComment} setComment={setApproveComment} onApprove={handleApprove} />}
      {tab === "my" && <ReqList loading={loading} reqs={myReqs} empty="暂无请购记录" />}
      {tab === "history" && <ReqList loading={loading} reqs={historyReqs} empty="暂无历史记录" showDetail />}
      {showForm && (
        <div className="hui-overlay" onClick={() => setShowForm(false)} role="dialog" aria-modal="true">
          <div className="hui-dialog" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="hui-dialog-title">新建请购</h3>
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--hui-surface2)" }}>
              <button className={`flex-1 py-1.5 text-xs font-medium rounded-md ${mode === "select" ? "bg-white shadow-sm" : ""}`} style={{ color: mode === "select" ? "var(--hui-text)" : "var(--hui-text2)" }} onClick={() => setMode("select")}>选择已有耗材</button>
              <button className={`flex-1 py-1.5 text-xs font-medium rounded-md ${mode === "new" ? "bg-white shadow-sm" : ""}`} style={{ color: mode === "new" ? "var(--hui-text)" : "var(--hui-text2)" }} onClick={() => setMode("new")}>请购新耗材</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              {formError && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{formError}</div>}
              {formMsg && <div role="status" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-success-light)", color: "var(--hui-success)" }}>{formMsg}</div>}
              {mode === "select" ? (
                <>
                  <Field label="耗材 *"><select className="hui-input hui-select" required value={selItemId} onChange={(e) => setSelItemId(e.target.value)}><option value="">请选择</option>{items.map((it) => (<option key={it.id} value={it.id}>{it.name} ({it.project || "-"}) 库存:{it.current_stock}{it.unit}{it.supplier ? ` 供应商:${it.supplier}` : ""}</option>))}</select></Field>
                  <Field label="单价"><input className="hui-input" type="text" readOnly value={selItemId ? (() => { const it = items.find((x) => x.id === Number(selItemId)); return it?.price != null ? `¥${it.price.toFixed(2)} (自动带入)` : "未设定"; })() : ""} style={{ background: "var(--hui-surface2)", cursor: "not-allowed" }} /></Field>
                  {selItemId && (() => { const it = items.find((x) => x.id === Number(selItemId)); return it?.supplier ? <Field label="供应商"><input className="hui-input" type="text" readOnly value={it.supplier + " (自动带入)"} style={{ background: "var(--hui-surface2)", cursor: "not-allowed" }} /></Field> : null; })()}
                  <Field label="数量 * (整数)"><input className="hui-input" type="number" min="1" step="1" required value={selQty} onChange={(e) => setSelQty(e.target.value.replace(/\D/g, ""))} /></Field>
                  <Field label="申请理由"><input className="hui-input" value={selReason} onChange={(e) => setSelReason(e.target.value)} placeholder="用途说明" /></Field>
                </>
              ) : (
                <>
                  <Field label="耗材名称 *"><input className="hui-input" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新耗材名称" /></Field>
                  {showNewCat ? (
                    <div className="flex gap-2 items-end">
                      <Field label="新类别" cls="flex-1"><input className="hui-input" autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)} /></Field>
                      <button className="hui-btn hui-btn-solid hui-btn-sm" type="button" onClick={async () => { if (!newCatName.trim()) return; try { const cat = await createCategory({ name: newCatName.trim() }); setCategories((p) => [...p, cat]); setNewCatId(String(cat.id)); setNewCatName(""); setShowNewCat(false); } catch (e) { setFormError(e instanceof Error ? e.message : "添加失败"); } }}>确定</button>
                      <button className="hui-btn hui-btn-ghost hui-btn-sm" type="button" onClick={() => setShowNewCat(false)}>取消</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end">
                      <Field label="类别" cls="flex-1"><select className="hui-input hui-select" value={newCatId} onChange={(e) => setNewCatId(e.target.value)}><option value="">请选择</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></Field>
                      <button className="hui-btn hui-btn-icon hui-btn-sm hui-btn-ghost" type="button" onClick={() => { setNewCatName(""); setShowNewCat(true); }}><IconPlus size={16} /></button>
                    </div>
                  )}
                  <Field label="专案"><input className="hui-input" value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="如 B482" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="单价 ¥"><input className="hui-input" type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="单价" /></Field>
                    <Field label="单位"><input className="hui-input" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} /></Field>
                  </div>
                  <Field label="供应商"><input className="hui-input" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="供应商" /></Field>
                  <Field label="数量 * (整数)"><input className="hui-input" type="number" min="1" step="1" required value={newQty} onChange={(e) => setNewQty(e.target.value.replace(/\D/g, ""))} /></Field>
                  <Field label="申请理由"><input className="hui-input" value={newReason} onChange={(e) => setNewReason(e.target.value)} /></Field>
                </>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button className="hui-btn hui-btn-bordered hui-btn-sm" type="button" onClick={() => setShowForm(false)}>取消</button>
                <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting}>提交请购</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${active ? "bg-white shadow-sm" : ""}`}
      style={{ color: active ? "var(--hui-text)" : "var(--hui-text2)" }} onClick={onClick}>{children}</button>
  );
}

function Field({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return <div className={`hui-input-wrap ${cls || ""}`}><label>{label}</label>{children}</div>;
}

function ApproveTab({ loading, reqs, comment, setComment, onApprove }: {
  loading: boolean; reqs: Requisition[];
  comment: Record<number, string>; setComment: (v: Record<number, string>) => void;
  onApprove: (id: number, action: "approve" | "reject") => void;
}) {
  if (loading) return <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>;
  if (reqs.length === 0) return <p className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无待审批请购</p>;
  return (
    <div className="flex flex-col gap-3">
      {reqs.map((r) => (
        <div key={r.id} className="hui-card flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">
                {r.item_name || r.new_item_name || "新耗材"} × {r.quantity}{r.new_item_unit}
                {r.new_item_price != null && <span className="ml-2 font-bold">¥{(r.new_item_price * r.quantity).toFixed(2)}</span>}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--hui-text2)" }}>
                {r.new_item_price != null && <span>单价¥{r.new_item_price.toFixed(2)} · </span>}
{r.new_item_supplier ? `供应商:${r.new_item_supplier} · ` : ""}{r.reason || "无理由"} · 专案:{r.new_item_project || "-"} · 申请人: {r.requester_name} · {new Date(r.created_at).toLocaleString("zh-CN")}
              </div>
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
      ))}
    </div>
  );
}

function ReqList({ loading, reqs, empty, showDetail }: { loading: boolean; reqs: Requisition[]; empty: string; showDetail?: boolean }) {
  if (loading) return <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>;
  if (reqs.length === 0) return <p className="text-center py-16" style={{ color: "var(--hui-text3)" }}>{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {reqs.map((r) => (
        <div key={r.id} className="hui-card flex justify-between items-start">
          <div>
            <div className="font-medium text-sm">#{r.id} {r.item_name || r.new_item_name || "新耗材"} × {r.quantity}{r.new_item_unit} {r.new_item_price ? `¥${(r.new_item_price * r.quantity).toFixed(2)}` : ""}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--hui-text2)" }}>{r.new_item_supplier ? `供应商:${r.new_item_supplier} · ` : ""}{r.reason || "无理由"} · 专案:{r.new_item_project || "-"} · {new Date(r.created_at).toLocaleString("zh-CN")}</div>
            {showDetail && r.section_comment && <div className="text-xs mt-1" style={{ color: "var(--hui-primary)" }}>课级审批: {r.section_comment}</div>}
            {showDetail && r.department_comment && <div className="text-xs mt-0.5" style={{ color: "var(--hui-success)" }}>部级审批: {r.department_comment}</div>}
          </div>
          <span className={`hui-chip ${STATUS_COLOR[r.status] || ""}`}>{STATUS_MAP[r.status] || r.status}</span>
        </div>
      ))}
    </div>
  );
}

