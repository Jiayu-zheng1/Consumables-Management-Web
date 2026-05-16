import { request } from "./client";
import type { Item, ItemCreate, ItemUpdate } from "./types";

export const getItems = (params: { search?: string; category_id?: number; project?: string; low_stock?: boolean } = {}) => {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.category_id) sp.set("category_id", String(params.category_id));
  if (params.project) sp.set("project", params.project);
  if (params.low_stock) sp.set("low_stock", "true");
  return request<Item[]>(`/items?${sp.toString()}`);
};

export const createItem = (data: ItemCreate) =>
  request<Item>("/items", { method: "POST", body: JSON.stringify(data) });

export const updateItem = (id: number, data: ItemUpdate) =>
  request<Item>(`/items/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteItem = (id: number) =>
  request<void>(`/items/${id}`, { method: "DELETE" });

export const getProjects = () => request<string[]>("/projects");
