import Icon from "../../components/Icon";
import { LANDING_FAQS, LANDING_POLICIES, LANDING_STEPS } from "./landingData";

/**
 * Khối Quy trình thuê 4 bước, Chính sách nổi bật và Câu hỏi thường gặp (FAQ) của trang chủ.
 */
export function LandingStepsFaq() {
  return (
    <>
      {/* How it works */}
      <section className="lp-steps-section">
        <div className="lp-container">
          <div className="lp-section-header lp-section-header--steps">
            <span className="lp-section-eyebrow lp-section-eyebrow--amber">Đơn giản & Nhanh chóng</span>
            <h2 className="lp-section-title">
              Quy trình thuê 4 bước tại GearGo
            </h2>
          </div>

          <div className="grid gap-6 lp-steps-grid">
            {LANDING_STEPS.map((s) => (
              <div key={s.num} className="card-hover-lift lp-step-card">
                <div className="lp-step-icon">
                  <Icon name={s.icon} size={26} />
                </div>
                <div className="lp-step-num">BƯỚC {s.num}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy highlight */}
      <section className="lp-policy-section">
        <div className="grid gap-5 lp-policy-grid">
          {LANDING_POLICIES.map((p) => (
            <div key={p.title} className="card-hover-lift lp-policy-card">
              <span className="lp-policy-icon">
                <Icon name={p.icon} size={22} />
              </span>
              <div>
                <div className="lp-policy-title">{p.title}</div>
                <div className="lp-policy-desc">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq-section">
        <div className="lp-section-header">
          <h2 className="lp-faq-title">
            Câu hỏi thường gặp
          </h2>
          <p className="lp-faq-sub">Những thắc mắc phổ biến của khách hàng khi thuê thiết bị tại GearGo</p>
        </div>
        <div className="flex flex-col gap-3">
          {LANDING_FAQS.map((f, i) => (
            <details key={i} className="lp-faq-item">
              <summary className="lp-faq-summary">
                <span className="lp-faq-star">✦</span> {f.q}
              </summary>
              <div className="lp-faq-answer">{f.a}</div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
