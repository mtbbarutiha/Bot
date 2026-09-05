import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, PawPrint } from 'lucide-react';
import { BRAND } from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import { loginPath } from '../lib/authRedirect';

const P = '/pepito/uploads';

const SERVICES = [
  { to: '/explore', title: 'پیدا کردن همبازی', desc: 'پت نزدیک را پیدا کن و درخواست بازی بفرست.', icon: `${P}/01.png` },
  { to: '/vet-consult', title: 'مشاوره دامپزشک', desc: 'ارتباط سریع با دامپزشک روی همان حساب ربات.', icon: `${P}/02.png` },
  { to: '/add-pet', title: 'ثبت پت', desc: 'پروفایل پت بساز؛ در تلگرام همان را می‌بینی.', icon: `${P}/03.png` },
  { to: '/matches', title: 'درخواست و چت', desc: 'حتی اگر طرف فقط ربات باشد، مکالمه مشترک می‌ماند.', icon: `${P}/04.png` },
  { to: '/clinics', title: 'کلینیک‌ها', desc: 'کلینیک نزدیک و پیگیری خدمات از دسکتاپ.', icon: `${P}/05.png` },
  { to: '/shop', title: 'پت‌شاپ', desc: 'لوازم و خوراک منتخب برای مراقبت روزانه.', icon: `${P}/06.png` },
] as const;

const PETS = [
  { name: 'میسی', meta: 'سگ · ۵ سال · ماده', img: `${P}/01-2.jpg`, to: '/explore' },
  { name: 'بلا', meta: 'سگ · ۳ سال · نر', img: `${P}/02-2.jpg`, to: '/explore' },
  { name: 'کیتی', meta: 'گربه · ۲ سال · ماده', img: `${P}/03-2.jpg`, to: '/explore' },
  { name: 'پنی', meta: 'سگ · ۱ سال · نر', img: `${P}/04-2.jpg`, to: '/explore' },
] as const;

const TEAM = [
  { name: 'دکتر سارا نوری', role: 'دامپزشک', img: `${P}/01-3.jpg` },
  { name: 'دکتر امیر رضایی', role: 'مدیر آموزش', img: `${P}/02-3.jpg` },
  { name: 'دکتر لیلا کیانی', role: 'مراقبت پت', img: `${P}/03-3.jpg` },
  { name: 'دکتر پویا مرادی', role: 'مشاوره آنلاین', img: `${P}/04-3.jpg` },
] as const;

const REVIEWS = [
  { handle: '@سارا', text: 'قابل اعتماد و مهربون؛ معلومه عاشق حیوانان‌اند!' },
  { handle: '@مینا', text: 'سگم عاشق همبازی‌شه و زمان‌بندی‌شون انعطاف‌پذیره.' },
  { handle: '@علی', text: 'درستکار و مطمئن؛ خرگوش‌هام عاشقشون شدن!' },
  { handle: '@نگار', text: 'دیدن اینکه بچه‌هام خوب مراقبت می‌شن همیشه لذت‌بخشه.' },
] as const;

const FAQS = [
  {
    q: 'آیا حساب وب و ربات یکی است؟',
    a: 'بله. با همان موبایل یا ایمیل وارد شو؛ پت‌ها، درخواست‌ها و چت‌ها روی یک دیتابیس مشترک می‌مانند.',
  },
  {
    q: 'برای دیدن لندینگ باید وارد شوم؟',
    a: 'خیر. لندینگ آزاد است. فقط برای همبازی، ثبت پت، دامپزشک، چت و شاپ باید با OTP وارد شوی.',
  },
  {
    q: 'اگر من وب باشم و طرف مقابل ربات؟',
    a: 'پیام و درخواست از API مشترک رد می‌شود؛ هر دو طرف همان مکالمه را می‌بینند.',
  },
  {
    q: 'طراحی این صفحه از کجا آمده؟',
    a: 'ظاهر و عکس‌ها بر پایه قالب Pepito تنظیم شده تا تجربه دسکتاپ شبیه یک سایت مراقبت از پت واقعی باشد.',
  },
] as const;

function GatedLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const { isLoggedIn, hasRole, isProfileComplete } = useAuthStore();
  const ready = isLoggedIn && hasRole && isProfileComplete;
  return (
    <Link to={ready ? to : loginPath(to)} className={className}>
      {children}
    </Link>
  );
}

export function WelcomePage() {
  const navigate = useNavigate();
  const { isLoggedIn, hasRole, isProfileComplete } = useAuthStore();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isLoggedIn && hasRole && isProfileComplete) {
      navigate('/home', { replace: true });
    }
  }, [isLoggedIn, hasRole, isProfileComplete, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pepito-landing">
      <header className={`pepito-nav${scrolled ? ' is-scrolled' : ''}`}>
        <Link to="/" className="pepito-nav-logo">
          <img src="/pepito/img/logo.png" alt="" />
          <span>{BRAND.displayName}</span>
        </Link>
        <nav className="pepito-nav-links" aria-label="بخش‌ها">
          <a href="#services">خدمات</a>
          <a href="#pets">پذیرش</a>
          <a href="#team">تیم</a>
          <a href="#reviews">نظرات</a>
          <a href="#faq">سؤالات</a>
        </nav>
        <div className="pepito-nav-actions">
          <Link to={loginPath('/home')} className="pepito-nav-login">
            ورود
          </Link>
          <GatedLink to="/explore" className="pepito-btn">
            شروع رایگان
            <PawPrint size={16} />
          </GatedLink>
        </div>
      </header>

      <section className="pepito-hero">
        <img className="pepito-hero-media" src={`${P}/3.jpg`} alt="" />
        <div className="pepito-hero-wash" aria-hidden />
        <div className="pepito-hero-inner">
          <p className="pepito-kicker">
            <span className="pepito-kicker-dot">
              <PawPrint size={16} />
            </span>
            عشق ما حیوانات‌اند
          </p>
          <h1>خدماتی برای پت‌های خاص شما!</h1>
          <p className="pepito-hero-lead">
            همبازی، دامپزشک و مراقبت پت روی دسکتاپ — با ظاهر Pepito و همان حساب مشترک با ربات تلگرام.
          </p>
          <div className="pepito-hero-cta">
            <GatedLink to="/explore" className="pepito-btn pepito-btn--lg">
              کشف کن
              <PawPrint size={16} />
            </GatedLink>
            <GatedLink to="/vet-consult" className="pepito-btn pepito-btn--ghost pepito-btn--lg">
              مشاوره دامپزشک
            </GatedLink>
          </div>
        </div>
      </section>

      <section className="pepito-section" id="services">
        <div className="pepito-section-head">
          <p className="pepito-eyebrow">عاشق حیواناتیم</p>
          <h2>خدمات مراقبت از پت</h2>
          <p>امکانات ربات، با تجربهٔ دسکتاپ قالب Pepito — داده همان لحظه سینک می‌ماند.</p>
        </div>
        <ul className="pepito-services">
          {SERVICES.map((s) => (
            <li key={s.to}>
              <GatedLink to={s.to} className="pepito-service">
                <img src={s.icon} alt="" />
                <strong>{s.title}</strong>
                <span>{s.desc}</span>
              </GatedLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="pepito-section pepito-section--soft" id="pets">
        <div className="pepito-section-head">
          <p className="pepito-eyebrow">پذیرش پت</p>
          <h2>یک دوست پشمالوی جدید پیدا کن</h2>
          <p>پیش‌نمایش عمومی؛ برای درخواست واقعی با OTP وارد شو.</p>
        </div>
        <div className="pepito-pets">
          {PETS.map((p) => (
            <article key={p.name} className="pepito-pet">
              <img src={p.img} alt={p.name} loading="lazy" />
              <div>
                <h3>{p.name}</h3>
                <p>{p.meta}</p>
                <GatedLink to={p.to} className="pepito-pet-cta">
                  درخواست همبازی
                </GatedLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pepito-section" id="team">
        <div className="pepito-section-head">
          <p className="pepito-eyebrow">متخصصان واجد شرایط</p>
          <h2>با تیم ما آشنا شو</h2>
        </div>
        <div className="pepito-team">
          {TEAM.map((m) => (
            <article key={m.name} className="pepito-member">
              <img src={m.img} alt="" loading="lazy" />
              <h3>{m.name}</h3>
              <p>{m.role}</p>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <GatedLink to="/vet-consult" className="pepito-btn">
            ارتباط با پزشک
            <ArrowLeft size={16} />
          </GatedLink>
        </div>
      </section>

      <section className="pepito-section pepito-section--lilac" id="reviews">
        <div className="pepito-section-head">
          <p className="pepito-eyebrow">عاشقان خوشحال پت</p>
          <h2>نظرات petdate</h2>
        </div>
        <div className="pepito-reviews">
          {REVIEWS.map((r) => (
            <blockquote key={r.handle} className="pepito-review">
              <p>{r.text}</p>
              <footer>{r.handle}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="pepito-section" id="faq">
        <div className="pepito-section-head">
          <p className="pepito-eyebrow">عمومی و پرتکرار</p>
          <h2>سؤالات متداول</h2>
        </div>
        <div className="pepito-faq">
          {FAQS.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className="pepito-faq-item">
                <button
                  type="button"
                  className="pepito-faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  <span>
                    {String(i + 1).padStart(2, '0')} {item.q}
                  </span>
                  <span aria-hidden>{open ? '−' : '+'}</span>
                </button>
                {open ? <p className="pepito-faq-a">{item.a}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="pepito-cta">
        <div className="pepito-cta-inner">
          <h2>آماده‌ای همبازی پیدا کنی؟</h2>
          <p>
            لندینگ آزاد است؛ برای امکانات اصلی با یک کد یکبارمصرف وارد دنیای مشترک وب و ربات شو.
          </p>
          <Link to={loginPath('/explore')} className="pepito-btn pepito-btn--lg">
            ورود و شروع
            <PawPrint size={16} />
          </Link>
        </div>
      </section>

      <footer className="pepito-footer">
        <Link to="/" className="pepito-nav-logo">
          <img src="/pepito/img/logo.png" alt="" />
          <span>{BRAND.displayName}</span>
        </Link>
        <p>
          ظاهر الهام‌گرفته از قالب Pepito · داده مشترک API با ربات تلگرام
          <br />
          {BRAND.taglineEn}
        </p>
      </footer>
    </div>
  );
}
