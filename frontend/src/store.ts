/**
 * ═════════════════════════════════════════════════════════════════════════════
 * GEARGO STORE — BARREL RE-EXPORT
 * ═════════════════════════════════════════════════════════════════════════════
 * File này đóng vai trò Barrel Re-export trung gian để đảm bảo 100% tương thích
 * ngược (backward compatibility) cho toàn bộ views và components hiện có.
 *
 * Các thành phần đã được phân tách chuyên biệt về:
 * - Types & Interfaces:  src/types/*
 * - Dữ liệu khởi tạo:    src/data/*
 * - Tiện ích & Format:   src/utils/*
 */

export * from "./types";
export * from "./data";
export * from "./utils";
