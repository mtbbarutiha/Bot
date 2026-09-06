import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, PawPrint } from 'lucide-react';
import { LandingChrome } from '../components/LandingChrome';

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'پت‌دیت چیست و چه کمکی می‌کند؟',
    a: 'پت‌دیت پلتفرم فارسی برای پیدا کردن همبازی پت، خرید از پت‌شاپ، پذیرش، و مشاوره دامپزشک است — همه روی یک حساب وب و ربات تلگرام.',
  },
  {
    q: 'آیا برای دیدن لندینگ و شاپ باید وارد شوم؟',
    a: 'خیر. صفحه اصلی و پت‌شاپ آزادند. برای همبازی، ثبت پت، چت، دامپزشک و ثبت سفارش شاپ با OTP وارد شوید.',
  },
  {
    q: 'حساب وب و ربات تلگرام یکی است؟',
    a: 'بله. با همان موبایل وارد می‌شوید؛ پت‌ها، درخواست‌های همبازی، چت و سفارش‌ها روی دیتابیس مشترک می‌مانند.',
  },
  {
    q: 'همبازی چگونه کار می‌کند؟',
    a: 'از «پنل همبازی» پت خود را ثبت کنید، پروفایل دیگران را ببینید و درخواست بفرستید. بعد از پذیرش می‌توانید چت کنید و قرار ملاقات بگذارید.',
  },
  {
    q: 'چطور پت جدید اضافه کنم؟',
    a: 'پس از ورود از منوی اپ یا ربات، «افزودن پت» را بزنید و عکس، نوع، نام و مشخصات را پر کنید. پت در پروفایل و همبازی نمایش داده می‌شود.',
  },
  {
    q: 'خرید از پت‌دیت شاپ چطور است؟',
    a: 'دسته را انتخاب کنید، فیلتر برند/قیمت بزنید، به سبد اضافه کنید و با ورود سفارش را ثبت کنید. قیمت‌ها به تومان است و کیف پول سایت پشتیبانی می‌شود.',
  },
  {
    q: 'مشاوره دامپزشک آنلاین دارید؟',
    a: 'بله. از بخش دامپزشک می‌توانید نوبت/مشاوره بگیرید. دامپزشکان تأییدشده روی همان حساب وب و تلگرام پاسخ می‌دهند.',
  },
  {
    q: 'پذیرش پت چیست؟',
    a: 'بخش پذیرش، پت‌های نیازمند خانه را نشان می‌دهد. جزئیات هر پت را ببینید و در صورت تمایل برای پذیرش اقدام کنید.',
  },
  {
    q: 'اگر مشکلی در ورود یا OTP پیش آمد چه کنم؟',
    a: 'شماره را با پیش‌شماره صحیح وارد کنید، پیامک را چند دقیقه صبر کنید و در صورت نیاز دوباره درخواست کد بدهید. برای پشتیبانی از فوتر یا ربات پیام بگذارید.',
  },
  {
    q: 'اطلاعات من امن است؟',
    a: 'ورود با OTP انجام می‌شود و داده‌های پت/چت روی سرور پروژه نگه داشته می‌شوند. رمز ثابت برای کاربران عادی لازم نیست؛ دسترسی ادمین جداگانه است.',
  },
];

export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <LandingChrome>
      <div className="pepito-container pepito-faq-page">
        <header className="pepito-faq-page-head">
          <p className="pepito-eyebrow">
            <span className="pepito-eyebrow-icon" aria-hidden>
              <PawPrint size={18} />
            </span>
            پشتیبانی
          </p>
          <h1>سؤالات متداول</h1>
          <p>ده پرسش پرتکرار درباره پت‌دیت، همبازی، شاپ و دامپزشک.</p>
          <Link to="/explore" className="pepito-btn button-1">
            رفتن به پنل همبازی
          </Link>
        </header>

        <div className="pepito-faq-page-list">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`pepito-faq-item${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="pepito-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={18} aria-hidden />
                </button>
                {isOpen ? <div className="pepito-faq-a">{item.a}</div> : null}
              </div>
            );
          })}
        </div>

        <p className="pepito-faq-page-more">
          هنوز جواب نگرفتید؟ از{' '}
          <Link to="/#faq">سؤالات صفحه اصلی</Link> ببینید یا در{' '}
          <a href="https://t.me/Petdatebot" target="_blank" rel="noreferrer">
            ربات تلگرام
          </a>{' '}
          پیام بگذارید.
        </p>
      </div>
    </LandingChrome>
  );
}
