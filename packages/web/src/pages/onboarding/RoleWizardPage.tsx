import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { UserRole } from '@petdate/shared';
import { USER_ROLE_LABELS } from '@petdate/shared';
import { useUserStore } from '../../hooks/useUserStore';

interface WizardStep {
  title: string;
  fields: { key: string; label: string; placeholder: string }[];
}

const WIZARD_STEPS: Partial<Record<UserRole, WizardStep[]>> = {
  pet_owner: [
    {
      title: 'اطلاعات اولیه',
      fields: [
        { key: 'city', label: 'شهر', placeholder: 'مثلاً: تهران' },
        { key: 'neighborhood', label: 'محله', placeholder: 'مثلاً: ونک' },
      ],
    },
  ],
  vet: [
    {
      title: 'پروفایل دامپزشک',
      fields: [
        { key: 'clinic', label: 'نام کلینیک', placeholder: 'کلینیک شما' },
        { key: 'specialty', label: 'تخصص', placeholder: 'مثلاً: جراحی' },
      ],
    },
  ],
  no_pet: [
    {
      title: 'علاقه‌مندی‌ها',
      fields: [
        { key: 'interest', label: 'چه حیوانی دوست داری؟', placeholder: 'سگ، گربه، ...' },
      ],
    },
  ],
  pet_seeker: [
    {
      title: 'دنبال چه پتی هستی؟',
      fields: [
        { key: 'species', label: 'نوع حیوان', placeholder: 'سگ، گربه، ...' },
        { key: 'size', label: 'سایز ترجیحی', placeholder: 'کوچک، متوسط، بزرگ' },
      ],
    },
  ],
  community_seeker: [
    {
      title: 'جامعه پت',
      fields: [
        { key: 'topics', label: 'موضوعات مورد علاقه', placeholder: 'آموزش، سلامت، بازی' },
      ],
    },
  ],
  trainer: [
    {
      title: 'پروفایل مربی',
      fields: [
        { key: 'specialty', label: 'تخصص آموزشی', placeholder: 'آموزش سگ، رفتارشناسی' },
        { key: 'experience', label: 'سابقه (سال)', placeholder: '۳' },
      ],
    },
  ],
  pet_sitter: [
    {
      title: 'نگهبانی پت',
      fields: [
        { key: 'area', label: 'منطقه فعالیت', placeholder: 'شمال تهران' },
        { key: 'rate', label: 'نرخ روزانه (تومان)', placeholder: '۵۰۰۰۰۰' },
      ],
    },
  ],
};

export function RoleWizardPage() {
  const { role } = useParams<{ role: UserRole }>();
  const navigate = useNavigate();
  const { saveOnboardingToApi } = useUserStore();
  const [values, setValues] = useState<Record<string, string>>({});

  if (!role || !WIZARD_STEPS[role]) {
    navigate('/onboarding/role', { replace: true });
    return null;
  }

  const steps = WIZARD_STEPS[role]!;
  const step = steps[0];

  const handleComplete = async () => {
    if (role === 'pet_owner') {
      await saveOnboardingToApi('profile_incomplete');
      navigate('/onboarding/pet', { replace: true });
      return;
    }
    await saveOnboardingToApi('profile_complete');
    navigate('/', { replace: true });
  };

  return (
    <div className="onboarding-page">
      <button
        type="button"
        className="icon-btn icon-btn--spaced"
        onClick={() => navigate('/onboarding/role')}
        aria-label="بازگشت"
      >
        <ArrowRight size={20} strokeWidth={2} />
      </button>

      <header className="onboarding-header">
        <span className="role-badge">{USER_ROLE_LABELS[role]}</span>
        <h1>{step.title}</h1>
        <p>اطلاعات پایه رو وارد کن — بعداً می‌تونی کامل‌تر کنی</p>
      </header>

      <form
        className="wizard-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleComplete();
        }}
      >
        {step.fields.map((field) => (
          <div key={field.key} className="form-group">
            <label className="form-label">{field.label}</label>
            <input
              className="form-input"
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ))}

        <button type="submit" className="cta-btn">
          {role === 'pet_owner' ? 'مرحله بعد — ثبت پت' : 'شروع استفاده از petdate'}
        </button>
      </form>
    </div>
  );
}
