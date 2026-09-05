import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
} from 'lucide-react';
import { BRAND } from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { imageForType, WELCOME_HERO } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { loginPath } from '../lib/authRedirect';

const SERVICES = [
  {
    to: '/explore',
    title: 'پیدا کردن همبازی',
    desc: 'پت‌های نزدیک را ببین و درخواست بازی بفرست — داده با ربات یکی است.',
    icon: Heart,
  },
  {
    to: '/vet-consult',
    title: 'ارتباط با دامپزشک',
    desc: 'مشاوره سریع، پرونده و نسخه روی همان حساب ربات.',
    icon: Stethoscope,
  },
  {
    to: '/add-pet',
    title: 'ثبت پت',
    desc: 'پروفایل پت بساز؛ در تلگرام همان پروفایل را می‌بینی.',
    icon: PawPrint,
  },
  {
    to: '/matches',
    title: 'درخواست‌ها و چت',
    desc: 'حتی اگر طرف مقابل فقط ربات باشد، مکالمه مشترک می‌ماند.',
    icon: MessageCircle,
  },
  {
    to: '/clinics',
    title: 'کلینیک‌ها',
    desc: 'کلینیک نزدیک و پیگیری خدمات از دسکتاپ.',
    icon: ShieldCheck,
  },
  {
    to: '/shop',
    title: 'پت‌شاپ',
    desc: 'لوازم و خوراک منتخب برای مراقبت روزانه.',
    icon: ShoppingBag,
  },
] as const;

const PETS = [
  { name: 'رکس', meta: 'سگ · ۲ سال · تهران', type: 'dog' as const, idx: 2 },
  { name: 'موکا', meta: 'گربه · ۱ سال · کرج', type: 'cat' as const, idx: 3 },
  { name: 'پیچی', meta: 'خرگوش · ۸ ماه · اصفهان', type: 'rabbit' as const, idx: 1 },
  { name: 'آبی', meta: 'پرنده · ۳ سال · شیراز', type: 'bird' as const, idx: 0 },
];

const TEAM = [
  { name: 'دکتر سارا نوری', role: 'دامپزشک عمومی', img: imageForType('dog', 0) },
  { name: 'دکتر امیر رضایی', role: 'اورژانس و جراحی', img: imageForType('cat', 2) },
  { name: 'دکتر لیلا کیانی', role: 'پوست و تغذیه', img: imageForType('dog', 5) },
  { name: 'دکتر پویا مرادی', role: 'مشاوره آنلاین', img: imageForType('cat', 6) },
];

const REVIEWS = [
  { handle: '@سارا', text: 'همبازی برای سگم پیدا شد؛ چت وب و ربات یکی بود.' },
  { handle: '@مینا', text: 'دامپزشک آنلاین جواب داد و نسخه را همان لحظه دیدم.' },
  { handle: '@علی', text: 'پت را تو وب ثبت کردم، تو ربات همان پروفایل آمد.' },
  { handle: '@نگار', text: 'صفحه دسکتاپ خیلی روان‌تر و زیباتر از کیبورد ربات است.' },
];

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
];

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
    <div className="landing">
      <header className={`landing-nav${scrolled ? ' is-scrolled' : ''}`}>
        <BrandMark iconSize={32} className="landing-nav-brand" />
        <nav className="landing-nav-links" aria-label="بخش‌های صفحه">
          <a href="#services">خدمات</a>
          <a href="#pets">پت‌ها</a>
          <a href="#team">تیم</a>
          <a href="#faq">سؤالات</a>
        </nav>
        <div className="landing-nav-actions">
          <Link to={loginPath('/home')} className="landing-nav-login">
            ورود
          </Link>
          <GatedLink to="/explore" className="landing-nav-cta">
            شروع رایگان
          </GatedLink>
        </div>
      </header>

      <section className="landing-hero">
        <img className="landing-hero-media" src={WELCOME_HERO} alt="" />
        <div className="landing-hero-wash" aria-hidden />
        <div className="landing-hero-inner">
          <div className="landing-brand-mark">
            <span className="landing-brand-en">{BRAND.displayName}</span>
            <span className="landing-brand-tag">{BRAND.taglineEn}</span>
          </div>
          <h1 className="landing-hero-title">{BRAND.taglineFa}</h1>
          <p className="landing-hero-lead">
            همبازی، دامپزشک و خدمات پت روی دسکتاپ — با طراحی آزاد وب، و همان حساب مشترک با ربات تلگرام.
          </p>
          <div className="landing-hero-cta">
            <GatedLink to="/explore" className="landing-btn landing-btn--primary">
              پیدا کردن همبازی
              <ArrowLeft size={18} />
            </GatedLink>
            <GatedLink to="/vet-consult" className="landing-btn landing-btn--ghost">
              مشاوره دامپزشک
            </GatedLink>
          </div>
        </div>
      </section>

      <section className="landing-section" id="services">
        <div className="landing-section-head">
          <p className="landing-kicker">خدمات مراقبت از پت</p>
          <h2>امکانات ربات، تجربهٔ دسکتاپ</h2>
          <p>برای هر بخش وارد حساب شو؛ داده همان لحظه با تلگرام سینک می‌ماند.</p>
        </div>
        <ul className="landing-service-grid">
          {SERVICES.map((s) => (
            <li key={s.to}>
              <GatedLink to={s.to} className="landing-service">
                <span className="landing-service-icon">
                  <s.icon size={22} strokeWidth={2} />
                </span>
                <strong>{s.title}</strong>
                <span>{s.desc}</span>
                <em className="landing-service-cta">
                  ادامه
                  <ArrowLeft size={16} />
                </em>
              </GatedLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section landing-pets" id="pets">
        <div className="landing-section-head">
          <p className="landing-kicker">همبازی‌ها</p>
          <h2>پت‌هایی که منتظر بازی‌اند</h2>
          <p>پیش‌نمایش عمومی؛ برای درخواست واقعی با OTP وارد شو.</p>
        </div>
        <div className="landing-pet-rail">
          {PETS.map((p) => (
            <article key={p.name} className="landing-pet">
              <img src={imageForType(p.type, p.idx)} alt={p.name} loading="lazy" />
              <div>
                <h3>{p.name}</h3>
                <p>{p.meta}</p>
                <GatedLink to="/explore" className="landing-pet-cta">
                  درخواست همبازی
                </GatedLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="team">
        <div className="landing-section-head">
          <p className="landing-kicker">تیم دامپزشکی</p>
          <h2>پزشک‌های آمادهٔ مشاوره</h2>
        </div>
        <div className="landing-team-grid">
          {TEAM.map((m) => (
            <article key={m.name} className="landing-member">
              <img src={m.img} alt="" loading="lazy" />
              <h3>{m.name}</h3>
              <p>{m.role}</p>
            </article>
          ))}
        </div>
        <div className="landing-section-cta">
          <GatedLink to="/vet-consult" className="landing-btn landing-btn--primary">
            ارتباط با پزشک
          </GatedLink>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-kicker">نظر پت‌دوست‌ها</p>
          <h2>از دسکتاپ تا تلگرام</h2>
        </div>
        <div className="landing-review-grid">
          {REVIEWS.map((r) => (
            <blockquote key={r.handle} className="landing-review">
              <p>{r.text}</p>
              <footer>{r.handle}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="landing-section" id="faq">
        <div className="landing-section-head">
          <p className="landing-kicker">سؤالات پرتکرار</p>
          <h2>قبل از ورود بدانی</h2>
        </div>
        <div className="landing-faq-list">
          {FAQS.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className={`landing-faq-item${open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="landing-faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  <span>{item.q}</span>
                  <span aria-hidden>{open ? '−' : '+'}</span>
                </button>
                {open ? <p className="landing-faq-a">{item.a}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-cta-band-inner">
          <h2>آماده‌ای همبازی پیدا کنی؟</h2>
          <p>
            لندینگ آزاد است؛ برای امکانات اصلی با یک کد یکبارمصرف وارد دنیای مشترک وب و ربات شو — یک حساب، یک دیتابیس.
          </p>
          <Link to={loginPath('/explore')} className="landing-btn landing-btn--primary">
            ورود و شروع
            <ArrowLeft size={18} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <BrandMark iconSize={28} />
        <p>
          {BRAND.displayName} · {BRAND.taglineEn}
          <br />
          داده مشترک API — همگام با ربات تلگرام
        </p>
      </footer>
    </div>
  );
}
