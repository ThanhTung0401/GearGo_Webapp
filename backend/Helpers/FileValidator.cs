using Microsoft.AspNetCore.Http;
using System.IO;
using System.Linq;
using System.Collections.Generic;

namespace GearGo.Helpers
{
    public static class FileValidator
    {
        public static bool IsValidImage(IFormFile file, out string errorMessage)
        {
            errorMessage = string.Empty;

            // 1. Kiểm tra có file không
            if (file == null || file.Length == 0)
            {
                errorMessage = "File không tồn tại hoặc rỗng.";
                return false;
            }

            // 2. Kiểm tra dung lượng <= 5MB (Checklist 11.3)
            if (file.Length > 5 * 1024 * 1024)
            {
                errorMessage = "Dung lượng file vượt quá 5MB.";
                return false;
            }

            // 3. Kiểm tra đuôi file hợp lệ
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExts.Contains(ext))
            {
                errorMessage = "Chỉ chấp nhận file .jpg, .jpeg, .png, .webp.";
                return false;
            }

            // 4. Kiểm tra Magic Bytes (Chữ ký file thực tế, đọc 12 byte để xác thực cả RIFF....WEBP)
            using var reader = new BinaryReader(file.OpenReadStream());
            var signatures = new Dictionary<string, byte[][]>
            {
                { ".jpeg", new[] { new byte[] { 0xFF, 0xD8, 0xFF } } },
                { ".jpg",  new[] { new byte[] { 0xFF, 0xD8, 0xFF } } },
                { ".png",  new[] { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } } },
                // WEBP bắt đầu bằng "RIFF" (byte 0-3) và mang nhãn "WEBP" (byte 8-11)
                { ".webp", new[] { new byte[] { 0x52, 0x49, 0x46, 0x46 } } }
            };

            byte[] headerBytes = reader.ReadBytes(12);
            var expectedSigs = signatures[ext];

            bool isSignatureValid = expectedSigs.Any(sig =>
                headerBytes.Length >= sig.Length && headerBytes.Take(sig.Length).SequenceEqual(sig));

            // Với WEBP: ngoài header RIFF ở 4 byte đầu, phải khớp thêm 4 byte "WEBP" tại offset 8..11
            if (isSignatureValid && ext == ".webp")
            {
                isSignatureValid = headerBytes.Length >= 12
                    && headerBytes[8] == 0x57 && headerBytes[9] == 0x45
                    && headerBytes[10] == 0x42 && headerBytes[11] == 0x50;
            }

            if (!isSignatureValid)
            {
                errorMessage = "Nội dung file không khớp với định dạng ảnh (Fake file).";
                return false;
            }

            return true; // File an toàn 100%
        }
    }
}