import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import { relationshipService } from '../../services/relationshipService';
import { SubscriptionPlan, SubscriptionPlanId } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  GraduationCap,
  Target,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { MahfazaLogo } from '../../utils/logoConstants';

type RegistrationRole = 'student' | 'coach';
type CoachEntryType = 'independent' | 'invited';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Step 1 = Role / Category Selection, Step 2 = Details & Package / Invitation / Demo Form
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>('student');

  // Common User Account States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Commercial Package Selection States (One Single Source of Truth)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedStudentPlanId, setSelectedStudentPlanId] = useState<SubscriptionPlanId>('free');
  const [selectedCoachPlanId, setSelectedCoachPlanId] = useState<SubscriptionPlanId>('coach_starter');

  // Coach Entry Type: Independent (Package selection) vs Institution-Invited (Invitation code)
  const [coachEntryType, setCoachEntryType] = useState<CoachEntryType>('independent');

  // Institutional Invitation States (Invited Coach)
  const [institutionName, setInstitutionName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');

  // Student optional coach invite code
  const [studentCoachInviteCode, setStudentCoachInviteCode] = useState('');

  // Independent Coach States
  const [coachBio, setCoachBio] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Existing commercial plans from single source of truth
  const studentPlans = ALL_COMMERCIAL_PLANS.filter((p) => p.category === 'student');
  const coachPlans = ALL_COMMERCIAL_PLANS.filter((p) => p.category === 'coach');

  const roleOptions: {
    id: RegistrationRole;
    title: string;
    description: string;
    helperText?: string;
    actionBadge?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'student',
      title: 'Öğrenci',
      description: 'Akademik hedeflerini belirleyen, çalışma seansları ve görevlerle XP kazanan YKS / LGS öğrencisi.',
      icon: <GraduationCap className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'coach',
      title: 'Akademik Koç',
      description: 'Öğrencilerine bireysel çalışma programları, haftalık hedefler ve görevler atayan eğitim koçu.',
      icon: <Target className="w-5 h-5 text-indigo-400" />,
    },
  ];

  const handleStep1Continue = () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    setStep(2);
  };

  // Submit Standard Registration (Coach & Student)
  const handleUserRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setErrorMessage('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Şifre en az 6 karakter uzunluğunda olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }

    // Invitation Code Enforcement for Invited Coach
    const requiresInvitation = selectedRole === 'coach' && coachEntryType === 'invited';

    if (requiresInvitation) {
      if (!invitationCode.trim()) {
        setErrorMessage(
          'Kurum davet kodu zorunludur. Lütfen kurum yöneticinizden sağlanan davet kodunu girin.'
        );
        return;
      }

      if (invitationCode.trim().length < 4) {
        setErrorMessage('Geçersiz kurum davet kodu formatı. Lütfen kontrol edip tekrar deneyin.');
        return;
      }
    }

    setLoading(true);

    try {
      if (selectedRole === 'student') {
        if (studentCoachInviteCode.trim()) {
          const validation = await relationshipService.validateInviteCode(studentCoachInviteCode);
          if (!validation.valid) {
            setErrorMessage(validation.message || 'Geçersiz veya süresi dolmuş koç davet kodu.');
            setLoading(false);
            return;
          }
        }

        const { error, user: newUser } = await signUp(email, password, firstName, lastName, 'student');
        if (error) throw error;

        // Pair student with coach in real DB relationship if invite code provided
        if (newUser?.id && studentCoachInviteCode.trim()) {
          try {
            await relationshipService.pairStudentWithInviteCode(newUser.id, studentCoachInviteCode);
          } catch (pairErr) {
            console.warn('Coach invite pairing note:', pairErr);
          }
        }

        // Persist requested package selection in commercial architecture
        if (newUser?.id) {
          await subscriptionService.recordUserRegistrationPlan(newUser.id, selectedStudentPlanId);
        }

        if (selectedStudentPlanId !== 'free') {
          setSuccessNotice(
            `Hesabınız oluşturuldu! '${selectedStudentPlanId.toUpperCase()}' paket tercihiniz kaydedildi. Canlı banka ödeme entegrasyonu tamamlanana kadar hesabınız temel ücretsiz yetkilerle aktiftir.`
          );
          setTimeout(() => {
            navigate('/student/dashboard', { replace: true });
          }, 2000);
        } else {
          navigate('/student/dashboard', { replace: true });
        }
      } else if (selectedRole === 'coach') {
        const { error, user: newUser } = await signUp(email, password, firstName, lastName, 'coach');
        if (error) throw error;

        if (coachEntryType === 'independent' && newUser?.id) {
          // Persist requested coach plan selection
          await subscriptionService.recordUserRegistrationPlan(newUser.id, selectedCoachPlanId);

          setSuccessNotice(
            `Koçluk hesabınız oluşturuldu! Seçtiğiniz '${selectedCoachPlanId}' lisansı kaydedildi. Canlı ödeme geçidi aktif edilene kadar çalışma masanız kullanıma açılmıştır.`
          );
          setTimeout(() => {
            navigate('/coach/dashboard', { replace: true });
          }, 1800);
        } else {
          navigate('/coach/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Kayıt işlemi sırasında bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background Radial */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10 flex flex-col items-center">
        <Link
          to="/"
          className="inline-flex flex-col items-center group focus:outline-none"
          title="Ana Sayfaya Dön"
        >
          <MahfazaLogo size="lg" className="mb-2.5 group-hover:scale-105 transition-transform" />
          <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-zinc-100 group-hover:text-amber-400 transition-colors uppercase">
            MAHFAZA<span className="text-amber-400 font-mono text-base">.CO</span>
          </h1>
        </Link>
        <p className="text-xs text-zinc-400 mt-1 font-medium">
          Akademik İşletim Sistemi &bull; Kurumsal Kayıt & Katılım
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 1 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'font-bold text-zinc-100' : 'text-zinc-400'}>
              Rol & Katılım Türü
            </span>
          </div>
          <div className="h-0.5 w-10 sm:w-16 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 2 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'font-bold text-zinc-100' : 'text-zinc-400'}>
              Hesap & Paket Tercihi
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-relaxed">{successNotice}</span>
          </div>
        )}

        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-100">Hesap Türünüzü Seçin</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Mahfaza.co üzerindeki kullanım amacınıza uygun rolü seçin.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {roleOptions.map((opt) => {
                const isSelected = selectedRole === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedRole(opt.id)}
                    className={`w-full text-left p-3.5 rounded-lg border flex items-start gap-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-850/90 border-amber-500 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="p-2 rounded-md bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                      {opt.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-100">{opt.title}</span>
                        {opt.actionBadge && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500 text-zinc-950 shrink-0">
                            {opt.actionBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                      {opt.helperText && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-mono mt-1">
                          <KeyRound className="w-3 h-3" />
                          {opt.helperText}
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        isSelected ? 'border-amber-500 bg-amber-500' : 'border-zinc-700'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-zinc-950 font-bold" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer / Action Area */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
              <Link
                to="/auth/login"
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1"
              >
                Mevcut Hesabınızla Giriş Yapın
              </Link>
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleStep1Continue}
                className="w-full sm:w-auto"
              >
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS, PACKAGES & FORM */}
        {step === 2 && (
          <div>
            <form onSubmit={handleUserRegister} className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-base font-bold text-zinc-100">
                    {roleOptions.find((r) => r.id === selectedRole)?.title} Kayıt Formu
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedRole === 'student'
                      ? 'Hesap bilgilerinizi girin ve akademik hedefinize uygun planı seçin.'
                      : 'Akademik koçluk modelinize uygun katılım türünü seçin.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  onClick={() => setStep(1)}
                >
                  Geri
                </Button>
              </div>

                {/* COACH ENTRY TYPE TOGGLE (Independent vs Institution-Invited) */}
                {selectedRole === 'coach' && (
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                    <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider block">
                      Koçluk Katılım Modeli
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCoachEntryType('independent')}
                        className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer ${
                          coachEntryType === 'independent'
                            ? 'bg-purple-500/10 border-purple-500 text-zinc-100 font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold">Bağımsız Akademik Koç</div>
                        <div className="text-[10px] text-zinc-400 font-normal mt-0.5">
                          Bireysel danışan portföyü ve koçluk lisansı
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCoachEntryType('invited')}
                        className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer ${
                          coachEntryType === 'invited'
                            ? 'bg-purple-500/10 border-purple-500 text-zinc-100 font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold">Kurumsal Davet ile Katılım</div>
                        <div className="text-[10px] text-zinc-400 font-normal mt-0.5">
                          Okul veya kurs idaresinden alınan davet kodu
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Institutional Invitation Code Block (Required for Invited Coach) */}
                {selectedRole === 'coach' && coachEntryType === 'invited' && (
                  <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                      <KeyRound className="w-4 h-4 shrink-0" />
                      <span>Kurum Davet Doğrulaması</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Kurum Adı"
                        required
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="Örn: Bilfen Koleji"
                      />
                      <Input
                        label="Kurum Davet Kodu"
                        required
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        placeholder="Örn: KRM-2026-X8"
                        helperText="Okul veya kurs idarenizden edindiğiniz kod."
                      />
                    </div>
                  </div>
                )}

                {/* Student Optional Coach Invite Code Block */}
                {selectedRole === 'student' && (
                  <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                      <KeyRound className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Koç Davet Kodu (Opsiyonel)</span>
                    </div>
                    <Input
                      value={studentCoachInviteCode}
                      onChange={(e) => setStudentCoachInviteCode(e.target.value.toUpperCase())}
                      placeholder="Örn: KOC-AB12CD"
                      helperText="Özel bir koçunuz varsa, size ilettiği davet kodunu girerek doğrudan eşleşebilirsiniz."
                    />
                  </div>
                )}

                {/* Common Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Ad"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adınız"
                  />
                  <Input
                    label="Soyad"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Soyadınız"
                  />
                </div>

                <Input
                  label="E-Posta Adresi"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mahfaza.co"
                />

                {/* Coach Specific Field (Independent) */}
                {selectedRole === 'coach' && coachEntryType === 'independent' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Koçluk Alanı & Biyografi
                    </label>
                    <textarea
                      rows={2}
                      value={coachBio}
                      onChange={(e) => setCoachBio(e.target.value)}
                      placeholder="YKS Koçluğu, LGS hazırlık veya hedef odaklı çalışma felsefeniz..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Şifre"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                  />
                  <Input
                    label="Şifre Tekrar"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifreyi doğrulayın"
                  />
                </div>

                {/* 1. STUDENT PACKAGE SELECTION */}
                {selectedRole === 'student' && (
                  <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-100 block">
                          Paket Seçimi
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Hedefinize uygun akademik paketi belirleyin.
                        </span>
                      </div>

                      {/* Monthly / Yearly Toggle */}
                      <div className="inline-flex items-center p-0.5 bg-zinc-950 border border-zinc-800 rounded-md">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                            billingCycle === 'monthly'
                              ? 'bg-zinc-800 text-amber-400'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Aylık
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                            billingCycle === 'yearly'
                              ? 'bg-zinc-800 text-amber-400'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>Yıllık</span>
                          <span className="text-[9px] text-emerald-400 font-mono">~2 Ay Kazanç</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {studentPlans.map((plan) => {
                        const isSelected = selectedStudentPlanId === plan.id;
                        const price =
                          billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedStudentPlanId(plan.id)}
                            className={`p-3 rounded-lg border text-left transition-all relative cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500/50'
                                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            {plan.id === 'pro' && (
                              <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950 font-bold absolute -top-2 right-2">
                                Popüler
                              </span>
                            )}
                            <div className="text-xs font-bold text-zinc-100">{plan.name}</div>
                            <div className="text-xs font-bold font-mono text-amber-400 mt-1">
                              {price === 0 ? 'Ücretsiz' : `${price.toLocaleString('tr-TR')} ₺`}
                              {price > 0 && (
                                <span className="text-[9px] text-zinc-500 font-normal">
                                  /{billingCycle === 'yearly' ? 'yıl' : 'ay'}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-tight">
                              {plan.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. INDEPENDENT COACH PACKAGE SELECTION */}
                {selectedRole === 'coach' && coachEntryType === 'independent' && (
                  <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-100 block">
                          Koçluk Lisans Paketi
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Danışan öğrenci kapasitenize uygun lisansı seçin.
                        </span>
                      </div>

                      {/* Monthly / Yearly Toggle */}
                      <div className="inline-flex items-center p-0.5 bg-zinc-950 border border-zinc-800 rounded-md">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                            billingCycle === 'monthly'
                              ? 'bg-zinc-800 text-purple-400'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Aylık
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                            billingCycle === 'yearly'
                              ? 'bg-zinc-800 text-purple-400'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>Yıllık</span>
                          <span className="text-[9px] text-emerald-400 font-mono">İndirimli</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {coachPlans.map((plan) => {
                        const isSelected = selectedCoachPlanId === plan.id;
                        const price =
                          billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedCoachPlanId(plan.id)}
                            className={`p-3 rounded-lg border text-left transition-all relative cursor-pointer ${
                              isSelected
                                ? 'bg-purple-500/10 border-purple-500 shadow-sm ring-1 ring-purple-500/50'
                                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-100">{plan.name}</span>
                              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                {plan.student_capacity} Öğrenci
                              </span>
                            </div>
                            <div className="text-sm font-bold font-mono text-zinc-200 mt-1">
                              {price.toLocaleString('tr-TR')} ₺
                              <span className="text-[10px] text-zinc-500 font-normal">
                                /{billingCycle === 'yearly' ? 'yıl' : 'ay'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-tight">
                              {plan.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Action Area */}
                <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                  >
                    Rol Değiştir
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={loading}
                    className="w-full sm:w-auto"
                  >
                    Hesabı Oluştur
                  </Button>
                </div>
              </form>
          </div>
        )}
      </div>
    </div>
  );
};
