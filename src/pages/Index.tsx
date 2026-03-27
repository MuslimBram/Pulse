import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AIChatWidget } from "@/components/AIChatWidget";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useMonetizationCatalog } from "@/hooks/useMonetizationCatalog";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Zap, MessageSquare, BarChart3, Bot, ArrowRight, Shield,
  Users, Target, Sparkles, CheckCircle2, Star, Phone,
} from "lucide-react";
import { BusinessCapabilities } from "@/components/landing/BusinessCapabilities";
import { FreelancerCapabilities } from "@/components/landing/FreelancerCapabilities";
import { CompetitorComparison } from "@/components/landing/CompetitorComparison";

const COMMUNITY_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=face",
];

const Index = () => {
  const { user, loading } = useAuth();
  const { plans } = useMonetizationCatalog();
  const scrollRef = useScrollAnimation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background" ref={scrollRef}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Pulse AI</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/pricing">
              <Button variant="ghost" size="sm">{t("nav.pricing")}</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">{t("nav.login")}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t("nav.register")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-4 animate-fade-in-up">{t("landing.hero_badge")}</Badge>
          <h1 className="mx-auto mb-4 max-w-4xl text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            {t("landing.hero_title_1")}{" "}
            <span className="text-primary">{t("landing.hero_title_2")}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            {t("landing.hero_desc")}
          </p>
          <div className="mb-4 flex items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <Link to="/register">
              <Button size="lg" className="hover-lift">
                {t("landing.start_free")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="hover-lift">{t("landing.see_pricing")}</Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            {t("landing.trusted_by")}
          </p>
        </section>

        {/* Problem / Solution */}
        <section className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-16">
            <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
              <div className="animate-on-scroll is-visible">
                <Badge variant="destructive" className="mb-3">{t("landing.problem_badge")}</Badge>
                <h2 className="mb-3 text-2xl font-bold text-foreground">
                  {t("landing.problem_title")}
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-destructive">✕</span> {t("landing.problem_1")}</li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-destructive">✕</span> {t("landing.problem_2")}</li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-destructive">✕</span> {t("landing.problem_3")}</li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-destructive">✕</span> {t("landing.problem_4")}</li>
                </ul>
              </div>
              <div className="animate-on-scroll is-visible">
                <Badge className="mb-3">{t("landing.solution_badge")}</Badge>
                <h2 className="mb-3 text-2xl font-bold text-foreground">
                  {t("landing.solution_title")}
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("landing.solution_1")}</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("landing.solution_2")}</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("landing.solution_3")}</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("landing.solution_4")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-16">
          <div className="mb-12 text-center animate-on-scroll is-visible">
            <h2 className="mb-2 text-3xl font-bold text-foreground">{t("landing.why_title")}</h2>
            <p className="mx-auto max-w-lg text-muted-foreground">{t("landing.why_desc")}</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children is-visible">
            {[
              { icon: MessageSquare, title: t("landing.features.ai_title"), desc: t("landing.features.ai_desc") },
              { icon: Bot, title: t("landing.features.crm_title"), desc: t("landing.features.crm_desc") },
              { icon: BarChart3, title: t("landing.features.analytics_title"), desc: t("landing.features.analytics_desc") },
              { icon: Target, title: t("landing.features.automation_title"), desc: t("landing.features.automation_desc") },
              { icon: Users, title: t("landing.features.security_title"), desc: t("landing.features.security_desc") },
              { icon: Shield, title: t("landing.features.telephony_title"), desc: t("landing.features.telephony_desc") },
              { icon: Sparkles, title: t("landing.features.campaigns_title"), desc: t("landing.features.campaigns_desc") },
              { icon: Phone, title: t("landing.features.calls_title"), desc: t("landing.features.calls_desc") },
              { icon: Zap, title: t("landing.features.engine_title"), desc: t("landing.features.engine_desc") },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border p-6 hover-lift card-glow">
                <f.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <BusinessCapabilities />
        <FreelancerCapabilities />
        <CompetitorComparison />

        {/* Pricing Preview */}
        <section className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="animate-on-scroll is-visible">
              <h2 className="mb-2 text-3xl font-bold text-foreground">{t("landing.pricing_title")}</h2>
              <p className="mb-8 text-muted-foreground">{t("landing.pricing_desc")}</p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children is-visible">
              {plans.slice(0, 4).map((plan) => (
                <Card key={plan.key} className={`hover-lift card-glow ${plan.highlighted ? "border-primary ring-1 ring-primary" : ""}`}>
                  <CardContent className="pt-6 text-center">
                    {plan.highlighted && <Badge className="mb-2">{t("landing.recommended")}</Badge>}
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <p className="my-1 text-2xl font-bold text-foreground">{plan.key === "enterprise" ? "Custom" : `€${plan.monthlyPrice}`}</p>
                    <p className="mb-3 text-xs text-muted-foreground">{plan.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Link to="/pricing">
              <Button variant="outline" className="mt-6 hover-lift">{t("landing.compare_plans")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </section>

        {/* Testimonials with gradient bg */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
          <div className="container relative mx-auto px-4 py-16">
            <div className="mb-10 text-center animate-on-scroll is-visible">
              <h2 className="mb-2 text-3xl font-bold text-foreground">{t("landing.testimonials_title")}</h2>
              <p className="text-muted-foreground">{t("landing.testimonials_desc")}</p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3 stagger-children is-visible">
              {[
                { name: "Sarah K.", role: t("landing.testimonial_role_1"), quote: t("landing.testimonial_quote_1") },
                { name: "Michael R.", role: t("landing.testimonial_role_2"), quote: t("landing.testimonial_quote_2") },
                { name: "Elena T.", role: t("landing.testimonial_role_3"), quote: t("landing.testimonial_quote_3") },
              ].map((item) => (
                <Card key={item.name} className="hover-lift card-glow">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex gap-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
                    </div>
                    <p className="mb-4 text-sm italic text-muted-foreground">"{item.quote}"</p>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Community Marquee */}
        <section className="border-t border-border bg-muted/20 py-16">
          <div className="mb-8 text-center animate-on-scroll is-visible">
            <h2 className="mb-2 text-2xl font-bold text-foreground">{t("landing.community_title")}</h2>
            <p className="text-muted-foreground">{t("landing.community_desc")}</p>
          </div>

          {/* Marquee Row 1 */}
          <div className="marquee-container mb-4">
            <div className="marquee-track animate-marquee">
              {[...COMMUNITY_PHOTOS, ...COMMUNITY_PHOTOS].map((src, i) => (
                <img
                  key={`r1-${i}`}
                  src={src}
                  alt="Community member"
                  className="mx-2 h-20 w-20 rounded-xl object-cover shadow-md"
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          {/* Marquee Row 2 (reverse) */}
          <div className="marquee-container mb-8">
            <div className="marquee-track animate-marquee-reverse">
              {[...COMMUNITY_PHOTOS.slice().reverse(), ...COMMUNITY_PHOTOS.slice().reverse()].map((src, i) => (
                <img
                  key={`r2-${i}`}
                  src={src}
                  alt="Community member"
                  className="mx-2 h-20 w-20 rounded-xl object-cover shadow-md"
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          <div className="text-center animate-on-scroll is-visible">
            <Link to="/register">
              <Button size="lg" className="hover-lift">
                {t("landing.start_free")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
          <div className="container relative mx-auto px-4 py-16 text-center animate-on-scroll is-visible">
            <h2 className="mb-3 text-3xl font-bold text-foreground">{t("landing.cta_title")}</h2>
            <p className="mx-auto mb-6 max-w-md text-muted-foreground">
              {t("landing.cta_desc")}
            </p>
            <Link to="/register">
              <Button size="lg" className="hover-lift">
                {t("landing.cta_button")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">Pulse AI</span>
          </div>
          <p>© {new Date().getFullYear()} Pulse AI. All rights reserved.</p>
        </div>
      </footer>

      <AIChatWidget />
    </div>
  );
};

export default Index;
