import { getAuthorized } from "../../api/client";
import type { AdminProfile } from "../types";
export interface AdminService {
  getProfile(token: string, signal?: AbortSignal): Promise<AdminProfile>;
}
export const adminService: AdminService = {
  getProfile: (token, signal) =>
    getAuthorized<AdminProfile>("/api/admin/me", token, signal),
};
