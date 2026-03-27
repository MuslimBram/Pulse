import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Mail, Lock, User, Zap, Building2, Briefcase, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

type AccountType = "business" | "freelancer" | null;

const PLAN_TIERS = [
  { key: "start", label: "Start", base: 49 },
  { key: "growth", label: "Growth", base: 99, highlighted: true },
  { key: "pro", label: "Pro", base: 199 },
  { key: "enterprise", label: "Enterprise", base: 399 },
] as const;

const DURATIONS = [
  { key: "trial", label: "7-ditore Provë", months: 0, discount: 0, badge: "Falas" },
  { key: "monthly", label: "Mujore", months: 1, discount: 0 },
  { key: "3-month", label: "3 Muaj", months: 3, discount: 5, badge: "Kurseni 5%" },
  { key: "6-month", label: "6 Muaj", months: 6, discount: 10, badge: "Kurseni 10%" },
  { key: "yearly", label: "Vjetore", months: 12, discount: 15, badge: "Kurseni 15%" },
] as const;

const calcPrice = (base: number, discountPct: number) => {
  if (discountPct === 0) return base;
  return Math.round(base * (1 - discountPct / 100) * 100) / 100;
};

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1 && !accountType) {
      toast.error("Zgjidhni llojin e llogarisë");
      return;
    }
    if (step === 1 && accountType === "freelancer") {
      // Freelancers get free 7-day trial automatically
      setSelectedTier("start");
      setSelectedDuration("trial");
      setStep(3);
      return;
    }
    if (step === 2 && (!selectedTier || !selectedDuration)) {
      toast.error("Zgjidhni një plan dhe kohëzgjatje");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 3 && accountType === "freelancer") {
      setStep(1);
      return;
    }
    setStep(step - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Fjalëkalimi duhet të jetë të paktën 6 karaktere");
      return;
    }
    setLoading(true);

    try {
      const { data: fraudData, error: fraudError } = await supabase.functions.invoke("ai-registration-check", {
        body: {
          full_name: fullName,
          email,
          account_type: accountType,
          company_name: companyName || null,
          referral_code: refCode || null,
        },
      });

      if (fraudError) console.error("AI fraud check error:", fraudError);

      if (fraudData?.blocked) {
        toast.error("Regjistrimi nuk mund të përfundonte. Kontaktoni mbështetjen.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: accountType,
            company_name: companyName || null,
            billing_plan: selectedTier,
            billing_duration: selectedDuration,
            ...(refCode ? { referral_code: refCode } : {}),
            ...(fraudData?.risk_score !== undefined ? { ai_risk_score: fraudData.risk_score } : {}),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Kontrolloni email-in tuaj për të konfirmuar llogarinë");
        navigate("/login");
      }
    } catch {
      toast.error("Regjistrimi dështoi. Provo përsëri.");
    }
    setLoading(false);
  };

  const currentTier = PLAN_TIERS.find((t) => t.key === selectedTier);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Krijo Llogari</CardTitle>
          <CardDescription>
            {step === 1 && "Zgjidhni llojin e llogarisë"}
            {step === 2 && "Zgjidhni planin dhe kohëzgjatjen"}
            {step === 3 && "Plotësoni të dhënat tuaja"}
          </CardDescription>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-2 rounded-full transition-all",
                  s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/40" : "w-4 bg-border"
                )}
              />
            ))}
          </div>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {/* STEP 1: Account Type */}
            {step === 1 && (
              <div className="space-y-4">
                <Label>Lloji i llogarisë <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAccountType("business")}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
                      accountType === "business"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Building2 className="h-8 w-8" />
                    <span className="font-semibold">Biznes</span>
                    <span className="text-xs opacity-70 text-center">Kam një kompani dhe dua ta rris</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("freelancer")}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
                      accountType === "freelancer"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Briefcase className="h-8 w-8" />
                    <span className="font-semibold">Freelancer</span>
                    <span className="text-xs opacity-70 text-center">Punoj i pavarur, dua të fitoj</span>
                  </button>
                </div>
                {accountType === "freelancer" && (
                  <p className="text-sm text-center text-muted-foreground bg-muted/50 rounded-lg p-3">
                    ✨ Freelancerët fillojnë me <span className="font-semibold text-primary">7 ditë provë falas</span> automatikisht!
                  </p>
                )}
              </div>
            )}

            {/* STEP 2: Plan + Duration (Business only) */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Tier selection */}
                <div className="space-y-2">
                  <Label>Zgjidhni planin <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {PLAN_TIERS.map((tier) => (
                      <button
                        key={tier.key}
                        type="button"
                        onClick={() => setSelectedTier(tier.key)}
                        className={cn(
                          "relative flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all",
                          selectedTier === tier.key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50",
                          tier.highlighted && selectedTier !== tier.key && "border-primary/30"
                        )}
                      >
                        {tier.highlighted && <Badge className="absolute -top-2.5 text-[9px] px-2">Rekomanduar</Badge>}
                        {selectedTier === tier.key && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                        <span className="font-bold text-foreground">{tier.label}</span>
                        <span className="text-lg font-bold text-primary">€{tier.base}</span>
                        <span className="text-[10px] text-muted-foreground">/muaj</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration selection */}
                {selectedTier && (
                  <div className="space-y-2">
                    <Label>Kohëzgjatja <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                      {DURATIONS.map((dur) => {
                        const price = dur.key === "trial" ? 0 : calcPrice(currentTier!.base, dur.discount);
                        return (
                          <button
                            key={dur.key}
                            type="button"
                            onClick={() => setSelectedDuration(dur.key)}
                            className={cn(
                              "relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all",
                              selectedDuration === dur.key
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {selectedDuration === dur.key && (
                              <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />
                            )}
                            <span className="text-xs font-semibold text-foreground">{dur.label}</span>
                            <span className="text-sm font-bold text-primary">
                              {dur.key === "trial" ? "€0" : `€${price}`}
                            </span>
                            {dur.key === "trial" ? (
                              <Badge className="text-[9px] px-1.5 py-0">Falas</Badge>
                            ) : dur.badge ? (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{dur.badge}</Badge>
                            ) : (
                              <span className="text-[9px] text-muted-foreground">/muaj</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {selectedTier && selectedDuration && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Plani juaj:</p>
                    <p className="text-lg font-bold text-foreground">
                      {currentTier?.label} — {DURATIONS.find(d => d.key === selectedDuration)?.label}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedDuration === "trial"
                        ? "€0 (7 ditë falas)"
                        : `€${calcPrice(currentTier!.base, DURATIONS.find(d => d.key === selectedDuration)!.discount)}/muaj`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Personal Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Emri i plotë <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Emri Mbiemri" className="pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                </div>

                {accountType === "business" && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Emri i kompanisë</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="company" placeholder="Emri i biznesit tuaj" className="pl-9" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="ju@shembull.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Fjalëkalimi <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="Min 6 karaktere" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>

                {/* Plan summary in step 3 */}
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">
                    Llogaria: <span className="font-semibold text-foreground">{accountType === "business" ? "Biznes" : "Freelancer"}</span>
                    {" • "}Plani: <span className="font-semibold text-foreground">{currentTier?.label || "Start"}</span>
                    {" • "}{DURATIONS.find(d => d.key === selectedDuration)?.label || "7-ditore Provë"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <div className="flex w-full gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Mbrapa
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={handleNext} className="flex-1" disabled={step === 1 && !accountType}>
                  Vazhdo <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Po analizon & krijon llogarinë..." : "Krijo Llogarinë"}
                </Button>
              )}
            </div>

            {step === 3 && (
              <>
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ose</span></div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                    if (error) toast.error(String(error));
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Vazhdo me Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                    if (error) toast.error(String(error));
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Vazhdo me Apple
                </Button>
              </>
            )}

            <p className="text-sm text-muted-foreground">
              Ke llogari?{" "}
              <Link to="/login" className="text-primary hover:underline">Hyr</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Register;
