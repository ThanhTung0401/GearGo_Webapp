export interface SuggestedItem {
  productId: string;
  name: string;
  category: string;
  image?: string;
  qty: number;
  reason: string;
  pricePerDay: number;
  deposit: number;
}

export interface PresetCombo {
  id: string;
  name: string;
  tag: string;
  suitableFor: string;
  description: string;
  items: Array<{ cat: string; qty: number; reason: string }>;
}

export const PRESET_COMBOS: PresetCombo[] = [
  {
    id: "preset-tri-an",
    name: "Combo Hồ Trị An Thảnh Thơi (Chill Ven Hồ)",
    tag: "Phổ biến nhất",
    suitableFor: "2 - 4 người · 2 ngày 1 đêm",
    description: "Trọn bộ thư giãn bên bờ hồ lộng gió: lều vòm thoáng mát, bàn ghế dã ngoại xếp gọn, bếp nướng và đèn bão cổ điển.",
    items: [
      { cat: "Lều trại", qty: 1, reason: "Lều vòm 4 người chống ẩm sương đêm" },
      { cat: "Bàn ghế", qty: 1, reason: "Bộ bàn ghế xếp ngắm hoàng hôn ven hồ" },
      { cat: "Đèn", qty: 2, reason: "Đèn bão ánh sáng vàng ấm áp" },
      { cat: "Nấu ăn", qty: 1, reason: "Bếp nướng BBQ dã ngoại" },
    ],
  },
  {
    id: "preset-ta-nang",
    name: "Combo Trekking Tà Năng - Phan Dũng",
    tag: "Chuyên dụng leo núi",
    suitableFor: "2 - 4 người · Băng rừng siêu nhẹ",
    description: "Thiết kế tối ưu trọng lượng hành lý: lều nhôm chịu gió giật, túi ngủ nhiệt, đèn pin chống nước và bộ nồi siêu nhẹ.",
    items: [
      { cat: "Lều trại", qty: 1, reason: "Lều siêu nhẹ khung nhôm chịu gió giật" },
      { cat: "Ngủ", qty: 2, reason: "Túi ngủ giữ nhiệt chống rét ban đêm" },
      { cat: "Đèn", qty: 2, reason: "Đèn đeo trán cơ động xuyên rừng" },
      { cat: "Nấu ăn", qty: 1, reason: "Bộ nồi nhôm anode siêu nhẹ" },
    ],
  },
  {
    id: "preset-family-glamping",
    name: "Combo Family Glamping Sang Trọng",
    tag: "Gia đình tiện nghi",
    suitableFor: "4 - 6 người · Nghỉ dưỡng cuối tuần",
    description: "Tiện nghi tối đa như ở nhà: không gian rộng rãi, đệm êm ái, đầy đủ dụng cụ nấu nướng và dây đèn trang trí lung linh.",
    items: [
      { cat: "Lều trại", qty: 1, reason: "Lều không gian lớn thông thoáng cho cả nhà" },
      { cat: "Ngủ", qty: 4, reason: "Đệm hơi êm ái cho giấc ngủ thoải mái" },
      { cat: "Bàn ghế", qty: 1, reason: "Bàn nhôm rộng kèm ghế tựa lưng thoải mái" },
      { cat: "Nấu ăn", qty: 1, reason: "Trọn bộ dụng cụ nấu nướng gia đình" },
      { cat: "Đèn", qty: 2, reason: "Dây đèn LED & đèn treo trần lều ấm cúng" },
    ],
  },
];
