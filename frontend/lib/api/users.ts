import { request } from "./client";
import type { UserInfo, ProfileInfo, ProfileUpdate } from "./types";

export const getUsers = () => request<UserInfo[]>("/users");

export const updateUserLevel = (userId: number, level: string, department_code: string, department_scope?: string) =>
  request<{ message: string; department_scope: string }>(
    `/users/${userId}/level`,
    { method: "PUT", body: JSON.stringify({ level, department_code, department_scope: department_scope || "" }) }
  );

export const deleteUser = (userId: number) =>
  request<{ message: string }>(`/users/${userId}`, { method: "DELETE" });

export const getProfile = () => request<ProfileInfo>("/profile");

export const updateProfile = (data: ProfileUpdate) =>
  request<{ message: string; display_name: string; department_code: string; require_relogin?: boolean }>(
    "/profile", { method: "PUT", body: JSON.stringify(data) }
  );

export const resetPassword = (userId: number) =>
  request<{ message: string; new_password: string; username: string }>(
    `/users/${userId}/reset-password`, { method: "POST" }
  );
