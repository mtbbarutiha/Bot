import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COIN_PRICE_TOMAN, walletFromUserFields } from '@petdate/shared';
import { formatShopCoins, formatToman } from '../../data/shopCatalog';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useShopCart } from '../../hooks/useShopCart';
import { checkoutShopWithCoins } from '../../lib/api';
import { loginPath } from '../../lib/authRedirect';
import { ShopChrome } from '../../components/shop/ShopChrome';

export function ShopCartPage() {
  const { lines, itemCount, totalToman, totalCoins, setQty, remove, clear, rememberPaidOrder } =
    useShopCart();
  const { isLoggedIn, token, user, refreshMe } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidCoins, setPaidCoins] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const balance = useMemo(() => {
    if (!user) return 0;
    return user.wallet?.coins ?? walletFromUserFields(user).coins ?? user.coins ?? 0;
  }, [user]);

  const canAfford = balance >= totalCoins && totalCoins > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isLoggedIn || !token) {
      setError('برای پرداخت با سکه وارد حساب شوید.');
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
    if (!canAfford) {
      setError(
        `موجودی سکه کافی نیست. نیاز: ${totalCoins.toLocaleString('fa-IR')} — موجودی: ${balance.toLocaleString('fa-IR')}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await checkoutShopWithCoins(token, {
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
      });
      rememberPaidOrder({
        id: String(result.orderId),
        createdAt: new Date().toISOString(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        totalToman: result.totalToman,
        totalCoins: result.coinsSpent,
        status: 'paid',
        paymentCurrency: 'coins',
      });
      clear();
      setPaidCoins(result.coinsSpent);
      setOrderId(String(result.orderId));
      try {
        await refreshMe();
      } catch {
        /* wallet chip may lag */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'پرداخت ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ShopChrome bannerTitle="سبد خرید" bannerLead="پرداخت با سکه ربات — قیمت تومان هم نمایش داده می‌شود">
      <div className="pepito-container pd-shop-cart">
        {orderId ? (
          <div className="pd-shop-order-ok">
            <h2>پرداخت با سکه انجام شد</h2>
            <p>
              شماره سفارش: <strong dir="ltr">#{orderId}</strong>
            </p>
            {paidCoins != null ? (
              <p>
                مبلغ پرداختی: <strong>{formatShopCoins(paidCoins)}</strong>
              </p>
            ) : null}
            <p>سفارش به‌عنوان «پرداخت‌شده با سکه» در سرور ثبت شد.</p>
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
                        <p className="pd-shop-line-coins">{formatShopCoins(l.lineCoins)}</p>
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
                      <div className="pd-shop-cart-line-total">
                        <span>{formatToman(l.lineTotal)}</span>
                        <span className="pd-shop-line-coins">{formatShopCoins(l.lineCoins)}</span>
                      </div>
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
              <p className="pd-shop-checkout-coins">
                معادل سکه: <strong>{formatShopCoins(totalCoins)}</strong>
                <span className="pd-shop-checkout-rate">
                  (هر سکه ≈ {COIN_PRICE_TOMAN.toLocaleString('fa-IR')} تومان)
                </span>
              </p>
              {!isLoggedIn ? (
                <div className="pd-shop-soft-gate">
                  <p>مرور سبد آزاد است. برای پرداخت با سکه وارد شوید.</p>
                  <Link to={loginPath('/shop/cart')} className="pepito-btn button-1">
                    ورود برای پرداخت با سکه
                  </Link>
                </div>
              ) : (
                <form className="pd-shop-checkout-form" onSubmit={onSubmit}>
                  <p className="pd-shop-checkout-balance" role="status">
                    موجودی سکه شما:{' '}
                    <strong className={canAfford || lines.length === 0 ? undefined : 'pd-shop-balance-low'}>
                      {formatShopCoins(balance)}
                    </strong>
                    {!canAfford && lines.length > 0 ? (
                      <span className="pd-shop-afford-warn"> — موجودی کافی نیست</span>
                    ) : null}
                  </p>
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
                  <button
                    type="submit"
                    className="pepito-btn button-1"
                    disabled={lines.length === 0 || submitting || !canAfford}
                  >
                    {submitting ? 'در حال پرداخت…' : 'پرداخت با سکه'}
                  </button>
                  <p className="pd-shop-soon">
                    سکه‌ها از کیف پول مشترک وب و ربات کسر می‌شوند. کارت‌به‌کارت وب به‌زودی.
                  </p>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </ShopChrome>
  );
}
