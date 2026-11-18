import type { Product } from "../../../store";
import type { PresetCombo, SuggestedItem } from "../aiAdvisorPresets";

export type TripTerrain = "lake" | "mountain" | "glamping";

/**
 * Tìm sản phẩm đang hoạt động phù hợp theo danh mục và sức chứa ưu tiên trong kho GearGo.
 */
export function findActiveProductByCategory(
  products: Product[],
  categoryName: string,
  capacityMatch?: string
): Product | undefined {
  return (
    products.find(
      (p) =>
        p.category === categoryName &&
        p.status === "active" &&
        (capacityMatch ? p.capacity.includes(capacityMatch) : true)
    ) || products.find((p) => p.category === categoryName && p.status === "active")
  );
}

/**
 * Tạo danh sách combo gợi ý cục bộ theo quy mô đoàn, điểm đến và địa hình (dùng cho chế độ mock hoặc khôi phục combo).
 */
export function buildLocalAISuggestion(
  products: Product[],
  numPeople: number,
  destination: string,
  tripTerrain: TripTerrain
): SuggestedItem[] {
  const tentProd =
    numPeople <= 2
      ? findActiveProductByCategory(products, "Lều trại", "2") || findActiveProductByCategory(products, "Lều trại")
      : findActiveProductByCategory(products, "Lều trại", "4") || findActiveProductByCategory(products, "Lều trại");
  const sleepProd = findActiveProductByCategory(products, "Ngủ");
  const lightProd = findActiveProductByCategory(products, "Đèn");
  const cookProd = findActiveProductByCategory(products, "Nấu ăn");
  const tableProd = findActiveProductByCategory(products, "Bàn ghế");

  const list: SuggestedItem[] = [];

  if (tentProd) {
    list.push({
      productId: tentProd.id,
      name: tentProd.name,
      category: tentProd.category,
      image: tentProd.image,
      qty: Math.max(1, Math.ceil(numPeople / (tentProd.capacity.includes("2") ? 2 : 4))),
      reason: `Lều vòm chống mưa PU 3000mm, sức chứa phù hợp đoàn ${numPeople} người tại ${destination.split(" ")[0]}.`,
      pricePerDay: tentProd.pricePerDay,
      deposit: tentProd.deposit,
    });
  }

  if (sleepProd) {
    list.push({
      productId: sleepProd.id,
      name: sleepProd.name,
      category: sleepProd.category,
      image: sleepProd.image,
      qty: numPeople,
      reason: `Túi ngủ / đệm cá nhân giữ ấm thân nhiệt ban đêm (${numPeople} người).`,
      pricePerDay: sleepProd.pricePerDay,
      deposit: sleepProd.deposit,
    });
  }

  if (lightProd) {
    list.push({
      productId: lightProd.id,
      name: lightProd.name,
      category: lightProd.category,
      image: lightProd.image,
      qty: Math.max(1, Math.ceil(numPeople / 2)),
      reason: "Đèn bão chiếu sáng sinh hoạt khu trại và đi lại ban đêm an toàn.",
      pricePerDay: lightProd.pricePerDay,
      deposit: lightProd.deposit,
    });
  }

  if (cookProd) {
    list.push({
      productId: cookProd.id,
      name: cookProd.name,
      category: cookProd.category,
      image: cookProd.image,
      qty: 1,
      reason: "Bếp và bộ nồi nấu ăn dã ngoại đun nước, pha cà phê ngắm bình minh.",
      pricePerDay: cookProd.pricePerDay,
      deposit: cookProd.deposit,
    });
  }

  if (tableProd && (tripTerrain === "lake" || tripTerrain === "glamping")) {
    list.push({
      productId: tableProd.id,
      name: tableProd.name,
      category: tableProd.category,
      image: tableProd.image,
      qty: 1,
      reason: "Bàn ghế gấp gọn thư giãn ngắm cảnh bên bờ hồ / bãi trại.",
      pricePerDay: tableProd.pricePerDay,
      deposit: tableProd.deposit,
    });
  }

  return list;
}

/**
 * Ánh xạ bộ combo mẫu có sẵn (UC2.4.1) với các sản phẩm thực tế đang hoạt động trong kho.
 */
export function buildPresetItems(products: Product[], preset: PresetCombo): SuggestedItem[] {
  const list: SuggestedItem[] = [];
  preset.items.forEach((item) => {
    const p = findActiveProductByCategory(products, item.cat);
    if (p) {
      list.push({
        productId: p.id,
        name: p.name,
        category: p.category,
        image: p.image,
        qty: item.qty,
        reason: item.reason,
        pricePerDay: p.pricePerDay,
        deposit: p.deposit,
      });
    }
  });
  return list;
}
