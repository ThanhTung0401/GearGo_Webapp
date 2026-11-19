import { useApp } from "../../context/AppContext";
import { LandingHeroBooking } from "./landing/LandingHeroBooking";
import { LandingCategoriesFeatured } from "./landing/LandingCategoriesFeatured";
import { LandingStepsFaq } from "./landing/LandingStepsFaq";

/**
 * Trang chủ giới thiệu GearGo, chọn lịch thuê nhanh, danh mục, sản phẩm nổi bật và FAQ.
 */
export default function LandingView() {
  const app = useApp();
  const hasValidPeriod = app.hasValidRentalPeriod();

  return (
    <div className="lp-page">
      <LandingHeroBooking app={app} hasValidPeriod={hasValidPeriod} />
      <LandingCategoriesFeatured app={app} hasValidPeriod={hasValidPeriod} />
      <LandingStepsFaq />
    </div>
  );
}
