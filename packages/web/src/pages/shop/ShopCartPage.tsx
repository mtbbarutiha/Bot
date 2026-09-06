import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatToman } from '../../data/shopCatalog';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useShopCart } from '../../hooks/useShopCart';
import { loginPath } from '../../lib/authRedirect';
import { ShopChrome } from '../../components/shop/ShopChrome';

export function ShopCartPage() {
  const { lines, itemCount, totalToman, setQty, remove, placeOrderStub } = useShopCart();
  const { isLoggedIn } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isLoggedIn) {
      setError('برای ثبت سفارش وارد حساب شوید.');
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError('نام، موبایل و آدرس لازم است.');
      return;
    }
    if (lines.length === 0) {
      setError('سبد خالی است.');
      return;
    }
    const order = placeOrderStub({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim() || undefined,
    });
    setOrderId(order.id);
  };

  return (
    <ShopChrome bannerTitle="سبد خرید" bannerLead="قیمت‌ها به تومان — پرداخت آنلاین به‌زودی">
      <div className="pepito-container pd-shop-cart">
        {orderId ? (
          <div className="pd-shop-order-ok">
            <h2>سفارش ثبت شد</h2>
            <p>
              شماره پیگیری: <strong dir="ltr">{orderId}</strong>
            </p>
            <p>پرداخت آنلاین به‌زودی فعال می‌شود. سفارش شما به‌صورت محلی ذخیره شد.</p>
            <Link to="/shop" className="pepito-btn button-1">
              بازگشت به پت شاپ
            </Link>
          </div>
        ) : (
          <div className="pd-shop-cart-layout">
            <section className="pd-shop-cart-lines">
              <h2>
                سبد شما ({itemCount.toLocaleString('fa-IR')} قلم)
              </h2>
              {lines.length === 0 ? (
                <p className="pd-shop-empty">
                  سبد خالی است.{' '}
                  <Link to="/shop">شروع خرید</Link>
                </p>
              ) : (
                <ul className="pd-shop-cart-list">
                  {lines.map((l) => (
                    <li key={l.productId} className="pd-shop-cart-row">
                      <Link to={`/shop/product/${l.product.slug}`} className="pd-shop-cart-thumb">
                        <img src={l.product.image} alt="" />
                      </Link>
                      <div className="pd-shop-cart-meta">
                        <Link to={`/shop/product/${l.product.slug}`}>
                          <h3>{l.product.title}</h3>
                        </Link>
                        <p>{formatToman(l.product.priceToman)}</p>
                        <div className="pd-shop-qty">
                          <button type="button" onClick={() => setQty(l.productId, l.qty - 1)}>
                            −
                          </button>
                          <span>{l.qty.toLocaleString('fa-IR')}</span>
                          <button type="button" onClick={() => setQty(l.productId, l.qty + 1)}>
                            +
                          </button>
                          <button type="button" className="pd-shop-remove" onClick={() => remove(l.productId)}>
                            حذف
                          </button>
                        </div>
                      </div>
                      <div className="pd-shop-cart-line-total">{formatToman(l.lineTotal)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="pd-shop-checkout">
              <h2>تکمیل سفارش</h2>
              <p className="pd-shop-checkout-total">
                جمع: <strong>{formatToman(totalToman)}</strong>
              </p>
              {!isLoggedIn ? (
                <div className="pd-shop-soft-gate">
                  <p>مرور سبد آزاد است. برای ثبت سفارش وارد شوید.</p>
                  <Link to={loginPath('/shop/cart')} className="pepito-btn button-1">
                    ورود برای ثبت سفارش
                  </Link>
                  <p className="pd-shop-soon">پرداخت آنلاین به‌زودی</p>
                </div>
              ) : (
                <form className="pd-shop-checkout-form" onSubmit={onSubmit}>
                  <label>
                    نام گیرنده
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                  </label>
                  <label>
                    موبایل
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      dir="ltr"
                      inputMode="tel"
                      required
                    />
                  </label>
                  <label>
                    آدرس ارسال
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required />
                  </label>
                  <label>
                    توضیحات (اختیاری)
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                  </label>
                  {error ? <p className="pd-shop-form-error">{error}</p> : null}
                  <button type="submit" className="pepito-btn button-1" disabled={lines.length === 0}>
                    ثبت سفارش (به‌زودی پرداخت)
                  </button>
                  <p className="pd-shop-soon">پرداخت آنلاین به‌زودی — سفارش به‌صورت stub ذخیره می‌شود</p>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </ShopChrome>
  );
}
