import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Users,
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
    tone: 'coral',
  },
  {
    to: '/vet-consult',
    title: 'ارتباط با دامپزشک',
    desc: 'مشاوره سریع، پرونده و نسخه روی همان صف ربات.',
    icon: Stethoscope,
    tone: 'mint',
  },
  {
    to: '/add-pet',
    title: 'ثبت پت',
    desc: 'پروفایل پت بساز؛ در تلگرام همان پروفایل را می‌بینی.',
    icon: PawPrint,
    tone: 'sky',
  },
  {
    to: '/matches',
    title: 'درخواست‌ها و چت',
    desc: 'حتی اگر طرف مقابل فقط ربات باشد، مکالمه مشترک می‌ماند.',
    icon: MessageCircle,
    tone: 'sand',
  },
  {
    to: '/clinics',
    title: 'کلینیک‌ها',
    desc: 'کلینیک نزدیک و پیگیری خدمات از دسکتاپ.',
    icon: ShieldCheck,
    tone: 'sky',
  },
  {
    to: '/shop',
    title: 'پت‌شاپ',
    desc: 'لوازم و خوراک منتخب برای مراقبت روزانه.',
    icon: ShoppingBag,
    tone: 'coral',
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
  { handle: '@نگار', text: 'دکمه‌ها و صفحه دسکتاپ خیلی روان‌تر از کیبورد ربات است.' },
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

  function startExplore(e: FormEvent) {
    e.preventDefault();
    navigate(loginPath('/explore'));
  }

  return (
    <div className="landing">
      <header className={`landing-nav${scrolled ? ' is-scrolled' : ''}`}>
        <BrandMark iconSize={32} className="landing-nav-brand" />
        <nav className="landing-nav-links" aria-label="بخش‌های صفحه">
          <a href="#services">خدمات</a>
          <a href="#pets">پت‌ها</a>
          <a href="#sync">وب و ربات</a>
          <a href="#faq">سؤالات</a>
        </nav>
        <div className="landing-nav-actions">
          <Link to={loginPath('/home')} className="btn-text">
            ورود
          </Link>
          <GatedLink to="/explore" className="btn-primary">
            شروع رایگان
          </GatedLink>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">
            <Sparkles size={16} /> {BRAND.taglineEn}
          </p>
          <h1>
            <span className="landing-brand-word">{BRAND.displayName}</span>
            <span className="landing-hero-line">{BRAND.taglineFa}</span>
          </h1>
          <p className="landing-hero-lead">
            همبازی، دامپزشک و خدمات پت — روی دسکتاپ با طراحی آزاد و زیبا، و هم‌زمان با ربات تلگرام روی یک حساب.
          </p>
          <form className="landing-hero-cta" onSubmit={startExplore}>
            <button type="submit" className="btn-primary btn-primary--lg">
              پیدا کردن همبازی
              <ArrowLeft size={18} />
            </button>
            <GatedLink to="/vet-consult" className="btn-ghost btn-ghost--lg">
              مشاوره دامپزشک
            </GatedLink>
          </form>
          <ul className="landing-hero-stats">
            <li>
              <strong>یک حساب</strong>
              <span>وب + ربات</span>
            </li>
            <li>
              <strong>چت مشترک</strong>
              <span>بین کانال‌ها</span>
            </li>
            <li>
              <strong>OTP امن</strong>
              <span>موبایل یا ایمیل</span>
            </li>
          </ul>
        </div>
        <div className="landing-hero-visual">
          <img src={WELCOME_HERO} alt={BRAND.displayName} />
          <div className="landing-hero-orb" aria-hidden />
        </div>
      </section>

      <section className="landing-section" id="services">
        <div className="landing-section-head">
          <p className="landing-kicker">خدمات مراقبت از پت</p>
          <h2>امکانات ربات، تجربهٔ دسکتاپ</h2>
          <p>برای هر بخش وارد حساب شو؛ داده همان لحظه با تلگرام سینک می‌ماند.</p>
        </div>
        <div className="landing-services">
          {SERVICES.map((s) => (
            <GatedLink key={s.to} to={s.to} className={`landing-service tone-${s.tone}`}>
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
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--soft" id="pets">
        <div className="landing-section-head">
          <p className="landing-kicker">همبازی‌ها</p>
          <h2>پت‌هایی که منتظر بازی‌اند</h2>
          <p>پیش‌نمایش عمومی؛ برای درخواست واقعی وارد شو.</p>
        </div>
        <div className="landing-pets">
          {PETS.map((p) => (
            <article key={p.name} className="landing-pet">
              <img src={imageForType(p.type, p.idx)} alt={p.name} loading="lazy" />
              <div>
                <h3>{p.name}</h3>
                <p>{p.meta}</p>
              </div>
              <GatedLink to="/explore" className="btn-soft">
                درخواست همبازی
              </GatedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-band" id="sync">
        <div className="landing-band-inner">
          <Users size={28} />
          <div>
            <h2>وب و ربات، یک زندگی‌نامه</h2>
            <p>
              شماره یا ایمیل مشترک = یک کاربر. پت، مچ و پیام‌ها بین دسکتاپ و تلگرام جابه‌جا می‌شوند تا صاحب پت وب
              و طرف مقابل ربات بتوانند با هم حرف بزنند.
            </p>
          </div>
          <Link to={loginPath('/home')} className="btn-primary">
            اتصال حساب
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-kicker">تیم دامپزشکی</p>
          <h2>پزشک‌های آمادهٔ مشاوره</h2>
        </div>
        <div className="landing-reviews">
          {TEAM.map((m) => (
            <article key={m.name} className="landing-review">
              <img
                src={m.img}
                alt=""
                style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 14, marginBottom: 12 }}
              />
              <p style={{ fontWeight: 800, margin: 0 }}>{m.name}</p>
              <cite>{m.role}</cite>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <GatedLink to="/vet-consult" className="btn-primary">
            ارتباط با پزشک
          </GatedLink>
        </div>
      </section>

      <section className="landing-section landing-section--soft">
        <div className="landing-section-head">
          <p className="landing-kicker">نظر پت‌دوست‌ها</p>
          <h2>از دسکتاپ تا تلگرام</h2>
        </div>
        <div className="landing-reviews">
          {REVIEWS.map((r) => (
            <blockquote key={r.handle} className="landing-review">
              <p>{r.text}</p>
              <cite>{r.handle}</cite>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="landing-section" id="faq">
        <div className="landing-section-head">
          <p className="landing-kicker">سؤالات پرتکرار</p>
          <h2>قبل از ورود بدانی</h2>
        </div>
        <div className="landing-faq">
          {FAQS.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className="landing-faq-item">
                <button
                  type="button"
                  className="landing-faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontWeight: 800,
                    color: 'inherit',
                  }}
                >
                  <span>{item.q}</span>
                  <span aria-hidden>{open ? '−' : '+'}</span>
                </button>
                {open ? <p>{item.a}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-finale">
        <h2>آماده‌ای همبازی پیدا کنی؟</h2>
        <p>لندینگ آزاد است؛ برای امکانات اصلی با یک کد یکبارمصرف وارد دنیای مشترک وب و ربات شو.</p>
        <Link to={loginPath('/explore')} className="btn-primary btn-primary--lg">
          ورود و شروع
          <ArrowLeft size={18} />
        </Link>
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
