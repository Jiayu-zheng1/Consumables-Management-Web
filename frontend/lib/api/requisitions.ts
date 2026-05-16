import { request } from "./client";
import type { Requisition, RequisitionCreate } from "./types";

export const createRequisition = (data: RequisitionCreate) =>
  request<{ id: number; status: string; status_label: string; message: string }>(
    "/requisitions", { method: "POST", body: JSON.stringify(data) }
  );

export const getMyRequisitions = () => request<Requisition[]>("/requisitions/my");

export const getRequisitionsToApprove = () => request<Requisition[]>("/requisitions/to-approve");

export const getApprovedRequisitions = () => request<Requisition[]>("/requisitions/approved");

export const quickInbound = (reqId: number) =>
  request<{ message: string; item_name: string; quantity: number }>(
    `/requisitions/${reqId}/quick-inbound`, { method: "POST" }
  );

export const approveRequisition = (reqId: number, action: "approve" | "reject", comment: string) =>
  request<{ status: string; status_label: string; message: string }>(
    `/requisitions/${reqId}/approve`, { method: "POST", body: JSON.stringify({ action, comment }) }
  );

export const getPendingCount = () => request<{ count: number }>("/requisitions/pending-count");

export const getAllRequisitions = () => request<Requisition[]>("/requisitions/all");

export const getRequisitionHistory = () => request<Requisition[]>("/requisitions/history");

export const getMyUpdatesCount = () => request<{ count: number }>("/requisitions/my-updates-count");

export const resubmitRequisition = (reqId: number, data: RequisitionCreate) =>
  request<{ id: number; status: string; status_label: string; message: string }>(
    `/requisitions/${reqId}/resubmit`, { method: "POST", body: JSON.stringify(data) }
  );
