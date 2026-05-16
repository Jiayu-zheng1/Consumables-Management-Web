import { request } from "./client";
import type { DashboardStats, StockAlert, SpendingData } from "./types";

export const getDashboard = () => request<DashboardStats>("/dashboard");
export const getAlerts = () => request<StockAlert[]>("/alerts");

export const getSpendingData = (params: { year?: number; month?: number; department?: string } = {}) => {
  const sp = new URLSearchParams();
  if (params.year) sp.set("year", String(params.year));
  if (params.month) sp.set("month", String(params.month));
  if (params.department) sp.set("department", params.department);
  return request<SpendingData>(`/dashboard/spending?${sp.toString()}`);
};
