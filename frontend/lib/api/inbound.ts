import { request } from "./client";
import type { InboundRecord, InboundCreate } from "./types";

export const getInboundRecords = (params: { item_id?: number; page?: number } = {}) => {
  const sp = new URLSearchParams();
  if (params.item_id) sp.set("item_id", String(params.item_id));
  if (params.page) sp.set("page", String(params.page));
  return request<InboundRecord[]>(`/inbound?${sp.toString()}`);
};

export const createInbound = (data: InboundCreate) =>
  request<InboundRecord>("/inbound", { method: "POST", body: JSON.stringify(data) });
