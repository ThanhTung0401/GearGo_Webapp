import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";
import { readFileAsDataUrl, validateImageFile } from "../../utils/errorAndFileHelpers";

export type UploadFolder = "avatars" | "reviews" | "evidence" | "maintenance" | "inventory" | "general";

/**
 * Tải một tệp hình ảnh lên máy chủ (/api/tep-tin/upload) và trả về đường dẫn tương đối (/uploads/...).
 */
export async function uploadImageFile(file: File, folder: UploadFolder = "general"): Promise<string> {
  validateImageFile(file, 5);
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.postFormData<{ url?: string; duongDan?: string }>(
    `/api/tep-tin/upload?thuMuc=${encodeURIComponent(folder)}`,
    formData
  );
  const data = unwrapResult<{ url?: string; duongDan?: string }>(res.data);
  return data.url || data.duongDan || "";
}

/**
 * Tải tệp hình ảnh lên Backend khi dùng realApi, hoặc đọc sang DataURL khi ở chế độ mô phỏng.
 */
export async function uploadOrReadDataUrl(
  file: File,
  realApi: boolean,
  folder: UploadFolder = "general"
): Promise<string> {
  if (!realApi) {
    validateImageFile(file, 5);
    return readFileAsDataUrl(file);
  }
  const uploaded = await uploadImageFile(file, folder);
  return uploaded || readFileAsDataUrl(file);
}
