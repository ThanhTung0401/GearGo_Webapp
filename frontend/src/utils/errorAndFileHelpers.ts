/**
 * Chuẩn hóa trích xuất thông điệp lỗi an toàn từ unknown error (ApiError, Error, string).
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return fallback;
}

/**
 * Kiểm tra định dạng và dung lượng tệp ảnh tải lên (mặc định tối đa 5MB).
 */
export function validateImageFile(file: File, maxSizeMb = 5): void {
  if (!file.type.startsWith("image/")) {
    throw new Error(`Tệp "${file.name}" không phải định dạng ảnh hợp lệ.`);
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Ảnh "${file.name}" vượt quá giới hạn ${maxSizeMb}MB.`);
  }
}

/**
 * Đọc tệp ảnh sang chuỗi DataURL để xem trước ở chế độ mô phỏng.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });
}
