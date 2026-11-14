import { useApp } from "../App";
import { CartView } from "./customer/CartView";
import { CheckoutView } from "./customer/CheckoutView";
import { OrderConfirmedView } from "./customer/OrderConfirmedView";
import { MyOrdersView } from "./customer/MyOrdersView";
import { ProfileView } from "./customer/ProfileView";
import { AIAdvisorView } from "./customer/AIAdvisorView";

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
