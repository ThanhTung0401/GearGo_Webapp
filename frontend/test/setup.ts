import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tự động dọn dẹp DOM sau mỗi test case để tránh rò rỉ trạng thái giữa các test
afterEach(() => {
  cleanup();
});
