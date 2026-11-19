import { useApp } from "../App";
import { CartView } from "../modules/orders/CartView";
import { CheckoutView } from "../modules/orders/CheckoutView";
import { OrderConfirmedView } from "../modules/orders/OrderConfirmedView";
import { MyOrdersView } from "../modules/orders/MyOrdersView";
import { ProfileView } from "../modules/auth/ProfileView";
import { AIAdvisorView } from "../modules/marketing/AIAdvisorView";

export default function CustomerPortal() {
  const app = useApp();
  if (app.page === "cart") return <CartView />;
  if (app.page === "checkout") return <CheckoutView />;
  if (app.page === "order-confirmed") return <OrderConfirmedView />;
  if (app.page === "my-orders") return <MyOrdersView />;
  if (app.page === "profile") return <ProfileView />;
  if (app.page === "ai-advisor") return <AIAdvisorView />;
  return null;
}
