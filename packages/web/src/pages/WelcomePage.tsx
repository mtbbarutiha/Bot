import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bone,
  Cross,
  Dog,
  Footprints,
  GraduationCap,
  Home,
  Microscope,
  Moon,
  PartyPopper,
  PawPrint,
  Scissors,
  Syringe,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { BRAND } from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import { loginPath } from '../lib/authRedirect';

const P = '/pepito/uploads';

/** Display + tel: for Pepito-style “Call us” band */
const CONTACT_PHONE_DISPLAY = '۰۲۱-۸۸۷۷۶۶۵۵';
const CONTACT_PHONE_TEL = '+982188776655';

const BLOB_PATH =
  'M30,16C46.588,6.484,54.481-2.058,64.3,1.452c3.145,1.125,6.861,3.657,10.212,9.426A40.611,40.611,0,0,1,59.5,66.544,41.151,41.151,0,0,1,3.482,51.629C0.134,45.865-.2,41.289.375,38.125,2.228,27.979,13.544,25.436,30,16Z';

/** Pepito “Our pet care services” — 12 cards, rotating blob colors */
const SERVICES: {
  to: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  fill: 1 | 2 | 3 | 4;
}[] = [
  { to: '/explore', title: 'نگهداری پت', desc: 'مراقبت روزانه در خانه با خیال راحت برای پت‌های خاص شما.', Icon: Home, fill: 1 },
  { to: '/explore', title: 'پیاده‌روی سگ', desc: 'پیاده‌روی منظم و امن برای سگ‌ها در محله و پارک‌های نزدیک.', Icon: Footprints, fill: 2 },
  { to: '/vet-consult', title: 'دندان‌پزشکی پت', desc: 'بررسی و مراقبت از دندان و لثه با دامپزشکان مجرب.', Icon: Bone, fill: 3 },
  { to: '/clinics', title: 'واکسیناسیون', desc: 'برنامه واکسن به‌موقع برای سلامت و ایمنی پت شما.', Icon: Syringe, fill: 4 },
  { to: '/shop', title: 'آرایش پت', desc: 'شست‌وشو، کوتاهی مو و نظافت حرفه‌ای برای ظاهر درخشان.', Icon: Scissors, fill: 2 },
  { to: '/add-pet', title: 'برنامه توله', desc: 'آموزش پایه و مراقبت ویژه برای توله‌ها و گربه‌های جوان.', Icon: Dog, fill: 1 },
  { to: '/vet-consult', title: 'خدمات دامپزشکی', desc: 'ویزیت، مشاوره و پیگیری درمان روی همان حساب مشترک.', Icon: Cross, fill: 4 },
  { to: '/explore', title: 'مراقبت شبانه', desc: 'اقامت شبانه امن وقتی نمی‌توانید کنار پت‌تان باشید.', Icon: Moon, fill: 3 },
  { to: '/shop', title: 'وعده‌های سالم', desc: 'تغذیه متعادل و وعده‌های مناسب سن و نژاد پت.', Icon: Utensils, fill: 1 },
  { to: '/explore', title: 'فعالیت‌های سرگرم‌کننده', desc: 'بازی و همبازی برای انرژی و شادی روزانه پت‌ها.', Icon: PartyPopper, fill: 2 },
  { to: '/explore', title: 'خدمات آموزش', desc: 'تربیت رفتاری و فرمان‌پذیری با مربیان باتجربه.', Icon: GraduationCap, fill: 3 },
  { to: '/clinics', title: 'میکروچیپ', desc: 'شناسایی دائمی پت برای امنیت بیشتر در گم‌شدن.', Icon: Microscope, fill: 4 },
];

const HERO_SLIDES = [
  {
    img: `${P}/3.jpg`,
    kicker: 'عشق ما حیوانات‌اند',
    title: 'خدماتی برای پت‌های خاص شما!',
    lead: 'دامپزشکان قابل‌اعتماد که پت‌تان را در اولویت می‌گذارند.',
  },
  {
    img: `${P}/2.jpg`,
    kicker: 'عشق ما حیوانات‌اند',
    title: 'مراقبت از پت‌های شما',
    lead: 'دامپزشکان قابل‌اعتماد که پت‌تان را در اولویت می‌گذارند.',
  },
  {
    img: `${P}/4.jpg`,
    kicker: 'عشق ما حیوانات‌اند',
    title: 'آماده‌ایم از پت‌تان مراقبت کنیم',
    lead: 'دامپزشکان قابل‌اعتماد که پت‌تان را در اولویت می‌گذارند.',
  },
] as const;

const PETS = [
  {
    name: 'میسی',
    img: `${P}/01-2.jpg`,
    to: '/explore',
    details: [
      { label: 'جنسیت', value: 'ماده' },
      { label: 'عقیم‌شده', value: 'خیر' },
      { label: 'سن', value: '۵ سال' },
    ],
  },
  {
    name: 'بلا',
    img: `${P}/02-2.jpg`,
    to: '/explore',
    details: [
      { label: 'جنسیت', value: 'نر' },
      { label: 'عقیم‌شده', value: 'خیر' },
      { label: 'سن', value: '۳ سال' },
    ],
  },
  {
    name: 'کیتی',
    img: `${P}/03-2.jpg`,
    to: '/explore',
    details: [
      { label: 'جنسیت', value: 'ماده' },
      { label: 'عقیم‌شده', value: 'بله' },
      { label: 'سن', value: '۲ سال' },
    ],
  },
  {
    name: 'پنی',
    img: `${P}/04-2.jpg`,
    to: '/explore',
    details: [
      { label: 'جنسیت', value: 'نر' },
      { label: 'عقیم‌شده', value: 'خیر' },
      { label: 'سن', value: '۱ سال' },
    ],
  },
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
  style,
  children,
}: {
  to: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { isLoggedIn, hasRole, isProfileComplete } = useAuthStore();
  const ready = isLoggedIn && hasRole && isProfileComplete;
  return (
    <Link to={ready ? to : loginPath(to)} className={className} style={style}>
      {children}
    </Link>
  );
}

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function WelcomePage() {
  const navigate = useNavigate();
  const { isLoggedIn, hasRole, isProfileComplete } = useAuthStore();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [slide, setSlide] = useState(0);
  const [svcIndex, setSvcIndex] = useState(0);
  const [svcPaused, setSvcPaused] = useState(false);
  const svcTrackRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (svcPaused) return;
    const id = window.setInterval(() => {
      setSvcIndex((i) => (i + 1) % SERVICES.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [svcPaused]);

  useEffect(() => {
    const track = svcTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.pepito-service-card');
    if (!card) return;
    const gap = 21.6; // 1.35rem
    const step = card.getBoundingClientRect().width + gap;
    const rtl = getComputedStyle(track).direction === 'rtl';
    track.scrollTo({ left: rtl ? -svcIndex * step : svcIndex * step, behavior: 'smooth' });
  }, [svcIndex]);


  const current = HERO_SLIDES[slide]!;

  return (
    <div className="pepito-landing">
      <header className={`pepito-nav${scrolled ? ' is-scrolled' : ''}`}>
        <Link to="/" className="pepito-nav-logo" aria-label={BRAND.displayName}>
          <img src="/pepito/img/logo.png" alt={BRAND.displayName} />
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
          {/* Pepito: Send a message → contact / chat */}
          <GatedLink to="/matches" className="pepito-btn pepito-btn--nav">
            <PawIcon size={14} />
            ارسال پیام
          </GatedLink>
        </div>
      </header>

      <section className="pepito-hero" aria-roledescription="carousel" aria-label="اسلایدر صفحه اصلی">
        <div className="pepito-hero-slides">
          {HERO_SLIDES.map((s, i) => (
            <div
              key={s.img}
              className={`pepito-hero-slide${i === slide ? ' is-active' : ''}`}
              aria-hidden={i !== slide}
            >
              <img className="pepito-hero-media" src={s.img} alt="" />
            </div>
          ))}
        </div>
        <div className="pepito-hero-wash" aria-hidden />
        <div className="pepito-hero-inner" key={slide}>
          <div className="pepito-hero-copy">
            <p className="pepito-kicker">
              <span className="pepito-kicker-dot">
                <PawPrint size={18} />
              </span>
              {current.kicker}
            </p>
            <h1>{current.title}</h1>
            <p className="pepito-hero-lead">{current.lead}</p>
            {/* Pepito: Discover only → button-1 */}
            <div className="pepito-hero-cta">
              <a href="#services" className="pepito-btn button-1">
                <PawIcon />
                کشف کن
              </a>
            </div>
          </div>
        </div>
        <div className="pepito-hero-dots" role="tablist" aria-label="اسلایدها">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.img}
              type="button"
              role="tab"
              aria-selected={i === slide}
              className={`pepito-hero-dot${i === slide ? ' is-active' : ''}`}
              onClick={() => setSlide(i)}
              aria-label={`اسلاید ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="pepito-section pepito-about" id="about">
        <div className="pepito-about-copy">
          <p className="pepito-eyebrow">عاشق حیواناتیم</p>
          <h2>خدماتی برای پت‌های خاص شما!</h2>
          <p>
            امکانات ربات، با تجربهٔ دسکتاپ قالب Pepito — داده همان لحظه سینک می‌ماند.
            دامپزشکان و همبازی‌ها روی یک حساب مشترک وب و تلگرام.
          </p>
          {/* Pepito: Read more → about / services */}
          <a href="#services" className="pepito-btn button-1">
            <PawIcon />
            بیشتر بخوانید
          </a>
        </div>
        <div className="pepito-about-media">
          <img src={`${P}/about.jpg`} alt="" loading="lazy" />
        </div>
      </section>

      <section className="pepito-section pepito-services-section" id="services">
        <div className="pepito-section-head pepito-section-head--center">
          <p className="pepito-eyebrow">
            <span className="pepito-eyebrow-icon" aria-hidden>
              <PawPrint size={18} />
            </span>
            عاشق حیواناتیم
          </p>
          <h2>خدمات مراقبت از پت ما</h2>
        </div>
        <div
          className="pepito-services-viewport"
          onMouseEnter={() => setSvcPaused(true)}
          onMouseLeave={() => setSvcPaused(false)}
        >
          <div className="pepito-services-track" ref={svcTrackRef}>
            {SERVICES.map((s) => {
              const Icon = s.Icon;
              return (
                <article key={s.title} className="pepito-service-card">
                  <GatedLink to={s.to} className="pepito-service">
                    <span className="pepito-service-icon">
                      <svg
                        className={`pepito-service-blob fill-${s.fill}`}
                        viewBox="0 0 80 72"
                        aria-hidden
                      >
                        <path d={BLOB_PATH} />
                      </svg>
                      <Icon size={48} strokeWidth={1.35} />
                    </span>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </GatedLink>
                </article>
              );
            })}
          </div>
        </div>
        <div className="pepito-services-dots" role="tablist" aria-label="خدمات">
          {SERVICES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === svcIndex}
              className={`pepito-services-dot${i === svcIndex ? ' is-active' : ''}`}
              onClick={() => setSvcIndex(i)}
              aria-label={s.title}
            />
          ))}
        </div>
      </section>

      <section className="pepito-section pepito-adoption" id="pets">
        <div className="pepito-section-head pepito-section-head--center">
          <p className="pepito-eyebrow">
            <span className="pepito-eyebrow-icon" aria-hidden>
              <PawPrint size={18} />
            </span>
            پذیرش یک پت
          </p>
          <h2>یک دوست پشمالوی جدید پیدا کن</h2>
        </div>
        <div className="pepito-adoption-grid">
          {PETS.map((p) => (
            <article key={p.name} className="pepito-adoption-card">
              <div className="pepito-adoption-media">
                <img src={p.img} alt={p.name} loading="lazy" />
                <div className="pepito-adoption-shade" aria-hidden />
              </div>
              <div className="pepito-adoption-front">
                <h3>{p.name}</h3>
              </div>
              <GatedLink to={p.to} className="pepito-adoption-back">
                <h3>{p.name}</h3>
                <ul>
                  {p.details.map((d) => (
                    <li key={d.label}>
                      {d.label}: {d.value}
                    </li>
                  ))}
                </ul>
              </GatedLink>
            </article>
          ))}
        </div>
        <div className="pepito-adoption-info">
          <span className="pepito-adoption-tag">پذیرش یک پت</span>
          <p className="pepito-adoption-desc">
            با ما تماس بگیرید{' '}
            <a href={`tel:${CONTACT_PHONE_TEL}`} dir="ltr" className="pepito-adoption-phone">
              {CONTACT_PHONE_DISPLAY}
            </a>{' '}
            برای اطلاعات بیشتر!
          </p>
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
              <div className="pepito-member-photo">
                <img src={m.img} alt="" loading="lazy" />
              </div>
              <div className="pepito-member-info">
                <h3>{m.name}</h3>
                <p>{m.role}</p>
              </div>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          {/* Pepito: Book now (button-3 pink) → contact / vet */}
          <GatedLink to="/vet-consult" className="pepito-btn button-3">
            <PawIcon />
            همین حالا رزرو کن
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
        <div className="pepito-faq-layout">
          <div className="pepito-faq-intro">
            <p className="pepito-eyebrow">عمومی و پرتکرار</p>
            <h2>سؤالات متداول</h2>
            <p>پاسخ‌های کوتاه دربارهٔ حساب مشترک وب و ربات، OTP و همگام‌سازی داده.</p>
            {/* Pepito: Other FAQs → FAQ page / #faq */}
            <a href="#faq" className="pepito-btn button-1">
              <PawIcon />
              سایر سؤالات
            </a>
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
        </div>
      </section>

      <section className="pepito-cta">
        <div className="pepito-cta-inner">
          <h2>آماده‌ای همبازی پیدا کنی؟</h2>
          <p>
            لندینگ آزاد است؛ برای امکانات اصلی با یک کد یکبارمصرف وارد دنیای مشترک وب و ربات شو.
          </p>
          <GatedLink to="/explore" className="pepito-btn button-1 pepito-btn--lg pepito-btn--on-dark">
            <PawIcon />
            پذیرش یک پت
          </GatedLink>
        </div>
      </section>

      <footer className="pepito-footer">
        <Link to="/" className="pepito-nav-logo" aria-label={BRAND.displayName}>
          <img src="/pepito/img/logo.png" alt={BRAND.displayName} />
        </Link>
        <p>
          داده مشترک API با ربات تلگرام
          <br />
          {BRAND.taglineEn}
        </p>
      </footer>
    </div>
  );
}
