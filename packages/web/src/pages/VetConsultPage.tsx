import { useState } from 'react';
import { Calendar, MessageCircle, Phone, Video } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { formatPrice } from '../data/services';

const CONSULT_TYPES = [
  { id: 'chat', label: 'چت متنی', icon: MessageCircle, price: 150000 },
  { id: 'call', label: 'تماس صوتی', icon: Phone, price: 250000 },
  { id: 'video', label: 'ویدیو کال', icon: Video, price: 350000 },
];

export function VetConsultPage() {
  const [selected, setSelected] = useState('chat');
  const [scheduled, setScheduled] = useState(false);

  const type = CONSULT_TYPES.find((t) => t.id === selected)!;

  return (
    <div className="service-page">
      <div className="page-title-block">
        <BrandMark className="greeting-brand" iconSize={22} />
        <h1>مشاوره دامپزشک</h1>
        <p>با دامپزشکان petdate در ارتباط باش</p>
      </div>

      <div className="consult-types">
        {CONSULT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`consult-type-card${selected === t.id ? ' active' : ''}`}
            onClick={() => setSelected(t.id)}
          >
            <t.icon size={24} strokeWidth={2} />
            <span>{t.label}</span>
            <small>{formatPrice(t.price)}</small>
          </button>
        ))}
      </div>

      <div className="consult-schedule">
        <h2>
          <Calendar size={18} strokeWidth={2} />
          زمان مشاوره
        </h2>
        <div className="form-group">
          <label className="form-label">تاریخ</label>
          <input type="date" className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">ساعت</label>
          <select className="form-select">
            <option>۱۰:۰۰</option>
            <option>۱۱:۰۰</option>
            <option>۱۴:۰۰</option>
            <option>۱۶:۰۰</option>
            <option>۱۸:۰۰</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">توضیحات</label>
          <textarea className="form-textarea" placeholder="علائم یا سوال خود را بنویسید..." />
        </div>
      </div>

      <div className="service-action-bar">
        <button
          type="button"
          className="cta-btn"
          onClick={() => setScheduled(true)}
        >
          💳 رزرو و پرداخت {formatPrice(type.price)}
        </button>
      </div>

      {scheduled && (
        <div className="toast" role="status">
          درخواست مشاوره ثبت شد — پرداخت آنلاین فاز بعدی
        </div>
      )}
    </div>
  );
}
