import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { MahfazaLogo } from '../utils/logoConstants';
import {
  Compass,
  CheckCircle2,
  TrendingUp,
  Award,
  Zap,
  Target,
  BookOpen,
  Calendar,
  Clock,
  Shield,
  FileText,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Users,
  GraduationCap,
  Layers,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'students' | 'coaches'>('students');

  const dashboardPath = user
    ? role === 'admin'
      ? '/admin/dashboard'
      : `/${role === 'head_coach' ? 'coach' : role || 'student'}/dashboard`
    : '/login';

  const handlePanelClick = () => {
    if (user) {
      navigate(dashboardPath);
    } else {
      navigate('/login');
    }
  };

  const faqs = [
    {
      q: 'Mahfaza.co tam olarak nedir ve kimler içindir?',
      a: 'Mahfaza.co, YKS, LGS, KPSS ve akademik sınavlara hazırlanan öğrenciler ile onların kişisel rehberlik ve akademik koçları için geliştirilmiş disiplin, görev yönetimi ve oyunlaştırılmış takip platformudur. Yalnızca koç ve öğrenci iş birliğine odaklanır.',
    },
    {
      q: 'Koç ve öğrenci sistemi nasıl koordine edilir?',
      a: 'Koçlar, öğrencilerine özel haftalık veya günlük görev paketleri tanımlar. Öğrenciler görevlerini tamamlayıp çalışma sürelerini ve kanıtlarını sisteme girer. Koç, kanıtı inceleyip onayladığında öğrencinin hanesine XP işlenir.',
    },
    {
      q: 'XP (Deneyim Puanı) ve Seviye sistemi nasıl çalışır?',
      a: 'Her tamamlanan ve koç tarafından onaylanan akademik görev, öğrenciye yaşam boyu XP ve harcanabilir cüzdan XP kazandırır. Öğrenciler biriken XP ile ödül mağazasından özel haklar edinebilir veya koçunun belirlediği hedeflere ulaşır.',
    },
    {
      q: 'Mobil cihazlardan erişilebilir mi?',
      a: 'Evet. Mahfaza.co tüm akıllı telefonlar, tabletler ve masaüstü tarayıcılarda tam duyarlı (responsive) çalışır. Ekstra uygulama indirmeden web tarayıcınız üzerinden tüm özelliklere erişebilirsiniz.',
    },
    {
      q: 'Veri gizliliği ve güvenliği nasıl korunur?',
      a: 'Platform, sektör standardı PostgreSQL Row Level Security (RLS) ile korunur. Bir öğrencinin notlarını, denemelerini ve görevlerini yalnızca kendisi ve kendisine atanmış yetkili koçu görebilir. Veriler asla üçüncü şahıslarla paylaşılmaz.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-500/20 selection:text-amber-900">
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group focus:outline-none">
              <MahfazaLogo size="md" className="group-hover:scale-105 transition-transform duration-200" />
              <div className="flex flex-col">
                <span className="font-serif tracking-wider text-xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  MAHFAZA<span className="text-amber-600 font-mono text-base">.CO</span>
                </span>
                <span className="text-[10px] tracking-widest uppercase text-slate-500 font-mono font-medium">
                  Akademik İşletim Sistemi
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
              <a href="#nasil-calisir" className="hover:text-amber-700 transition-colors">
                Nasıl Çalışır?
              </a>
              <a href="#ozellikler" className="hover:text-amber-700 transition-colors">
                Özellikler
              </a>
              <a href="#basari-yolculugu" className="hover:text-amber-700 transition-colors">
                Başarı Yolculuğu
              </a>
              <a href="#sss" className="hover:text-amber-700 transition-colors">
                Sık Sorulan Sorular
              </a>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <button
                  type="button"
                  onClick={handlePanelClick}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Panele Git
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePanelClick}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    Panele Git
                  </button>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  >
                    Giriş Yap
                  </Link>
                </>
              )}

              <Link
                to="/register"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-600/20 transition-all flex items-center gap-1.5"
              >
                Kayıt Ol
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                aria-label="Menüyü aç/kapat"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white/98 px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <a
              href="#nasil-calisir"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-amber-700"
            >
              Nasıl Çalışır?
            </a>
            <a
              href="#ozellikler"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-amber-700"
            >
              Özellikler
            </a>
            <a
              href="#basari-yolculugu"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-amber-700"
            >
              Başarı Yolculuğu
            </a>
            <a
              href="#sss"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-amber-700"
            >
              Sık Sorulan Sorular
            </a>

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handlePanelClick();
                }}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-200"
              >
                {user ? 'Panele Git' : 'Giriş Yap'}
              </button>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-amber-600 text-white font-bold text-sm shadow-xs"
              >
                Kayıt Ol (Koç veya Öğrenci)
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-28">
        {/* Subtle decorative warm glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-400/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold tracking-wide mb-6 shadow-xs">
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span>Akademik Disiplin & Kişisel Koçluk Platformu</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 font-serif leading-tight">
              Planını Kur.{' '}
              <span className="text-amber-700">
                Disiplinini Koru.
              </span>{' '}
              Hedefine Ulaş.
            </h1>

            {/* Subcopy */}
            <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto font-normal">
              Öğrenciler için günlük görev disiplini, odak seansları ve seviye atlama; koçlar için 360° analitik, kanıt
              onayı ve gerçek zamanlı rehberlik yönetimi.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
              >
                Hemen Başla (Koç & Öğrenci)
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handlePanelClick}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {user ? 'Panele Dön' : 'Panele Git / Giriş Yap'}
              </button>
            </div>
          </div>

          {/* Illustrative Product / Dashboard Preview */}
          <div className="mt-12 sm:mt-14 max-w-5xl mx-auto">
            <div className="rounded-2xl bg-white border border-slate-200/90 p-2 sm:p-4 shadow-xl relative">
              {/* Responsive Window Top Bar — Strictly solves hero collision with flex wrap, min-w-0, truncate */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-200 bg-slate-100/80 rounded-t-xl mb-4 overflow-hidden">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="min-w-0 flex-1 px-2 text-center">
                  <span className="font-mono text-[11px] sm:text-xs text-slate-600 truncate block">
                    mahfaza.co/student/dashboard — Haftalık Çalışma Kokpiti
                  </span>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[10px] sm:text-[11px] font-mono text-slate-700 font-medium shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Örnek Arayüz / Temsili Veriler
                  </span>
                </div>
              </div>

              {/* Illustrative Dashboard Content (Sample Metrics) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 sm:p-3">
                {/* Card 1: Görev Çizelgesi */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <Target className="w-4 h-4 text-amber-600" /> Haftalık Görevler
                      </span>
                      <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-mono font-medium">
                        4 / 5 Tamamlandı
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between text-xs shadow-2xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-800 font-medium">Matematik: Türev 120 Soru</span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-mono font-bold">+60 XP</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between text-xs shadow-2xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-800 font-medium">Fizik: Elektromanyetizma Özeti</span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-mono font-bold">+45 XP</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="text-slate-700">AYT Genel Denemesi Çözümü</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Bekliyor</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between">
                    <span>Koç Onayı: Doğrulandı</span>
                    <span className="text-emerald-700 font-bold">%80 Tamamlanma</span>
                  </div>
                </div>

                {/* Card 2: XP & Streak Analitiği */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <Zap className="w-4 h-4 text-amber-600" /> Disiplin & Seviye
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                        Seviye 7 (Üstat)
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-center mb-3 shadow-2xs">
                      <div className="text-2xl font-black text-amber-700 font-mono">1,840 XP</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Yaşam Boyu Kazanılan Deneyim</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 rounded-full w-3/4" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-xs font-bold text-amber-700 font-mono">14 Gün</div>
                        <div className="text-[10px] text-slate-500 font-medium">Aktif Streak</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-xs font-bold text-emerald-700 font-mono">32.5 Saat</div>
                        <div className="text-[10px] text-slate-500 font-medium">Haftalık Odak</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600 font-medium">
                    Sıradaki Ödül: 2,000 XP (VIP Deneme Analizi)
                  </div>
                </div>

                {/* Card 3: Koç Koordinasyonu & Hedef İlerlemesi */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <Users className="w-4 h-4 text-amber-600" /> Koç Geri Bildirimi
                      </span>
                      <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Son Güncelleme
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed mb-3 shadow-2xs">
                      <p className="italic text-slate-700">
                        &quot;Geometride üçgenler fasikülünü bitirmen harika oldu. AYT Matematik netlerindeki 4 soruluk artış
                        bu disiplinin eseri.&quot;
                      </p>
                      <div className="mt-2 text-[10px] text-amber-800 font-bold font-mono">
                        — Dr. Mehmet Y. (Akademik Koç)
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Hedef Üniversite:</span>
                        <span className="text-slate-900 font-semibold">İTÜ Bilgisayar Müh.</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Deneme Ortalaması:</span>
                        <span className="text-emerald-700 font-mono font-bold">102.5 Net</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Veli Görüşmesi Tamamlandı
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST & BENEFIT STRIP */}
      <section className="py-12 bg-white border-y border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xs uppercase font-mono tracking-widest text-amber-700 font-bold">
              Gerçek Yetenekler ve Temel Altyapı
            </h2>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              Mahfaza.co, akademik başarının vazgeçilmez 5 temel sütunu üzerine inşa edilmiştir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Akademik Hedef Takibi</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Hedeflenen bölüme uygun net ve soru hedefleri, deneme takvimi ve eksik konu tespiti.
              </p>
            </div>

            {/* 2 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Görev Disiplini</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Koçun atadığı haftalık görevler, öğrencinin yüklediği kanıtlar ve çift taraflı onay zinciri.
              </p>
            </div>

            {/* 3 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Gelişim Grafikleri</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Haftalık çalışma süreleri, ders bazlı soru dağılımları ve deneme netlerindeki eğilimler.
              </p>
            </div>

            {/* 4 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Koç Koordinasyonu</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Öğrenci 360° analizi, veli görüşme tutanakları ve doğrudan birebir rehberlik iletişimi.
              </p>
            </div>

            {/* 5 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">XP & Seviye Sistemi</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Kazanılan deneyim puanları, harcanabilir ödül cüzdanı ve motivasyon artıran streak serileri.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (4-STEP PROCESS) */}
      <section id="nasil-calisir" className="py-16 lg:py-24 relative bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-700 font-bold">
              4 Adımlı Başarı Metodolojisi
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
              Nasıl Çalışır?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Dağınık çalışma notlarını, kaybolan soru hedeflerini geride bırakın. Mahfaza ile sistematik ilerleyin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 relative group hover:border-amber-400 hover:shadow-md transition-all shadow-xs">
              <div className="text-3xl font-black font-mono text-slate-300 group-hover:text-amber-600 transition-colors mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hedefini Belirle</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hedeflediğin sınav, bölüm ve puan aralığını koçunla birlikte profilinde yapılandır.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 relative group hover:border-amber-400 hover:shadow-md transition-all shadow-xs">
              <div className="text-3xl font-black font-mono text-slate-300 group-hover:text-amber-600 transition-colors mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Planını Oluştur</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Koçunun sana özel oluşturduğu haftalık görev paketlerini ve günlük soru hedeflerini incele.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 relative group hover:border-amber-400 hover:shadow-md transition-all shadow-xs">
              <div className="text-3xl font-black font-mono text-slate-300 group-hover:text-amber-600 transition-colors mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">İlerlemeni Gör</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tamamladığın testleri, kronometreli odak seanslarını ve deneme sonuçlarını anında kaydet.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 relative group hover:border-amber-400 hover:shadow-md transition-all shadow-xs">
              <div className="text-3xl font-black font-mono text-slate-300 group-hover:text-amber-600 transition-colors mb-4">
                04
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">İstikrarını Koru</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Koçun kanıtlarını onayladıkça XP kazan, seviye atla, streak serilerini koru ve motivasyonunu zirvede tut.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURE SHOWCASE (Koçlar İçin / Öğrenciler İçin) */}
      <section id="ozellikler" className="py-16 lg:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-700 font-bold">
              Kişiselleştirilmiş Çalışma Alanları
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
              Her Rol İçin Kusursuz Donanım
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Koçların verimli yönetim ihtiyacı ile öğrencilerin oyunlaştırılmış disiplin beklentisi tek çatı altında.
            </p>

            {/* Role Switcher Tabs */}
            <div className="mt-8 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'students'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Öğrenciler İçin
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('coaches')}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'coaches'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Akademik Koçlar İçin
              </button>
            </div>
          </div>

          {/* Tab 1: Öğrenciler İçin */}
          {activeTab === 'students' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Odak Seansları & Kronometre</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Pomodoro ve serbest odak sayaçlarıyla telefon bildirimlerinden uzak, tam konsantre çalışma seansları
                    kaydedin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-amber-800 font-mono font-medium">
                  Süre tutulduğu an çalışma loguna işlenir.
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Oyunlaştırılmış Seviyeler & XP</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Her tamamlanan görev koç onayıyla XP&apos;ye dönüşür. Seviye atlayın, rozetleri toplayın ve motivasyon
                    çemberini güçlendirin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-amber-800 font-mono font-medium">
                  Cüzdan bakiyesi ve ödül mağazası entegre.
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Deneme Sınavı Net Analizleri</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    TYT, AYT, LGS deneme netlerinizi ders ve konu bazında kaydedin. Net grafiklerinizdeki artışı somut
                    olarak izleyin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-amber-800 font-mono font-medium">
                  Otomatik net hesaplama ve eğilim analizi.
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Koçlar İçin */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Öğrenci 360° Portföy Takibi</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Her öğrencinizin çalışma sürelerini, çözülen soru sayılarını, haftalık görev durumlarını ve deneme
                    ortalamalarını tek ekranda inceleyin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-amber-800 font-mono font-medium">
                  Kişisel portföy ve PDF rapor çıktısı.
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Görev Atama & Kanıt Onayı</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Öğrencilerinize özel son teslim tarihli görevler tanımlayın. Öğrencinin sunduğu kanıtları inceleyip
                    tek tıkla XP onaylayın veya revize isteyin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-amber-800 font-mono font-medium">
                  Gerçek zamanlı görev onay kuyruğu.
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Veli Görüşmeleri & Tutanaklar</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Periyodik veli bilgilendirme seanslarını kayıt altına alın. Veliye sunulacak akademik değerlendirme
                    notlarını sistem üzerinden arşivleyin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-amber-800 font-mono font-medium">
                  Görüşme arşivleme ve profesyonel tutanaklar.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. SUCCESS JOURNEY / BAŞARI YOLCULUĞU */}
      <section id="basari-yolculugu" className="py-16 lg:py-24 relative bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-700 font-bold">
              Sürdürülebilir Başarı Prensibi
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
              Akademik Başarı Yolculuğu
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Yüksek hedeflere tek bir gecede değil; günlük mikro adımlar, sıkı koç takibi ve sarsılmaz bir disiplin
              çemberiyle ulaşılır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold font-mono mb-4">
                A
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hedef Netliği & Analiz</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Nerede olduğunu bilmeyen nereye gideceğini seçemez. İlk haftada öğrencinin mevcut seviyesi, ders bazlı
                eksiklikleri ve hedef net marjı hesaplanır.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold font-mono mb-4">
                B
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Haftalık Görev Rutini</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Büyük hedefler parçalanarak haftalık somut görevlere dönüştürülür. Öğrenci her gün hangi konudan kaç soru
                çözeceğini ve ne kadar odaklanacağını bilir.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold font-mono mb-4">
                C
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Koç Gözetimi & Zirve</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Her hafta sonu koçla değerlendirme yapılır. Öğrenci serisini korur, denemelerindeki net sıçramalarını
                somut verilerle görerek özgüvenle ilerler.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section id="sss" className="py-16 lg:py-24 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-700 font-bold">
              Merak Edilenler
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
              Sık Sorulan Sorular
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Sistem işleyişi, roller ve koçluk koordinasyonu ile ilgili temel yanıtlar.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-slate-900 hover:text-amber-800 transition-colors focus:outline-none cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      openFaqIndex === idx ? 'rotate-180 text-amber-700' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA BANNER */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-amber-50/40 border-t border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif">
            Akademik Disiplinini Bugün Başlat
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Koç veya öğrenci olarak ücretsiz hesap oluşturun, hedeflerinizi belirleyin ve veriye dayalı başarı yolculuğuna
            katılın.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
            >
              Kayıt Ol (Koç veya Öğrenci)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={handlePanelClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-sm transition-all cursor-pointer shadow-xs"
            >
              {user ? 'Panele Git' : 'Mevcut Hesaba Giriş Yap'}
            </button>
          </div>
        </div>
      </section>

      {/* 9. PROFESSIONAL FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-900 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <MahfazaLogo size="sm" />
              <div>
                <span className="font-serif font-bold text-white text-base tracking-wide">
                  MAHFAZA<span className="text-amber-500 font-mono text-sm">.CO</span>
                </span>
                <p className="text-[11px] text-slate-400">Akademik İşletim Sistemi & Disiplin Platformu</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
              <a href="#nasil-calisir" className="hover:text-amber-400 transition-colors">
                Nasıl Çalışır?
              </a>
              <a href="#ozellikler" className="hover:text-amber-400 transition-colors">
                Özellikler
              </a>
              <a href="#basari-yolculugu" className="hover:text-amber-400 transition-colors">
                Başarı Yolculuğu
              </a>
              <a href="#sss" className="hover:text-amber-400 transition-colors">
                Sık Sorulan Sorular
              </a>
              <Link to="/login" className="hover:text-amber-400 transition-colors">
                Giriş Yap
              </Link>
              <Link to="/register" className="hover:text-amber-400 transition-colors">
                Kayıt Ol
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div>
              © {new Date().getFullYear()} Mahfaza.co — Tüm hakları saklıdır. Yalnızca Koç ve Öğrenci rolleri
              desteklenmektedir.
            </div>
            <div className="flex items-center gap-4">
              <span>Güvenli Supabase PostgreSQL RLS Altyapısı</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
