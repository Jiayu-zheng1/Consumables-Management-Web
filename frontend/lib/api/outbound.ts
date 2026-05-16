import { request } from "./client";
import type { OutboundRecord, OutboundCreate } from "./types";

export const getOutboundRecords = (params: { item_id?: number; page?: number } = {}) => {
  const sp = new URLSearchParams();
  if (params.item_id) sp.set("item_id", String(params.item_id));
  if (params.page) sp.set("page", String(params.page));
  return request<OutboundRecord[]>(`/outbound?${sp.toString()}`);
};

export const createOutbound = (data: OutboundCreate) =>
  request<OutboundRecord>("/outbound", { method: "POST", body: JSON.stringify(data) });
