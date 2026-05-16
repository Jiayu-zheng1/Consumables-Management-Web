import { request } from "./client";
import type { Category, CategoryCreate, CategoryUpdate } from "./types";

export const getCategories = (search = "") =>
  request<Category[]>(`/categories?search=${encodeURIComponent(search)}`);

export const createCategory = (data: CategoryCreate) =>
  request<Category>("/categories", { method: "POST", body: JSON.stringify(data) });

export const updateCategory = (id: number, data: CategoryUpdate) =>
  request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteCategory = (id: number) =>
  request<void>(`/categories/${id}`, { method: "DELETE" });
