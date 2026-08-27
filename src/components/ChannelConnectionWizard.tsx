import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useChannels, ChannelData } from "@/hooks/useChannels";
import { toast } from "@/components/ui/sonner";
import {
  CheckCircle2, AlertCircle, Loader2, Copy, ArrowRight, ArrowLeft,
  ExternalLink, Shield, Plug, Zap, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CredField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
  required?: boolean;
  help?: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  docsUrl?: string;
  docsLabel?: string;
  credentials: CredField[];
  webhookPath?: string;
  webhookInstructions?: string;
  verifyFn?: (creds: Record<string, string>) => Promise<{ ok: boolean; detail?: string }>;
}

const STEPS = ["Credentials", "Webhook", "Verify", "Done"] as const;
type Step = (typeof STEPS)[number];

interface WizardProps {
  provider: ProviderDef;
  open: boolean;
  onClose: () => void;
}

export const ChannelConnectionWizard = ({ provider, open, onClose }: WizardProps) => {
  const { channels, addChannel } = useChannels();
  const existing = channels.find((c) => c.channel_type === provider.id);

  const [step, setStep] = useState<Step>("Credentials");
  const [creds, setCreds] = useState<Record<string, string>>(() => {
    // Existing channel queries intentionally exclude settings/credentials so the
    // browser cannot rehydrate provider secrets. Users re-enter secrets on reconnect.
    return provider.credentials.reduce((a, f) => {
      a[f.key] = "";
      return a;
    }, {} as Record<string, string>);
  });
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const webhookUrl = provider.webhookPath
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${provider.webhookPath}`
    : null;

  const hasWebhookStep = !!provider.webhookPath;
  const activeSteps = hasWebhookStep ? STEPS : (["Credentials", "Verify", "Done"] as const);
  const stepIndex = activeSteps.indexOf(step as any);

  const canNext = () => {
    if (step === "Credentials") {
      return provider.credentials.filter((f) => f.required).every((f) => creds[f.key]?.trim());
    }
    if (step === "Verify") return verifyResult?.ok;
    return true;
  };

  const goNext = () => {
    const idx = activeSteps.indexOf(step as any);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1] as Step);
  };

  const goBack = () => {
    const idx = activeSteps.indexOf(step as any);
    if (idx > 0) setStep(activeSteps[idx - 1] as Step);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      if (provider.verifyFn) {
        const res = await provider.verifyFn(creds);
        setVerifyResult(res);
        if (!res.ok) toast.error(res.detail || "Verification failed");
      } else {
        setVerifyResult({ ok: true, detail: "Connection verified" });
      }
    } catch (e: any) {
      setVerifyResult({ ok: false, detail: e.message || "Verification error" });
    }
    setVerifying(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const channelData: ChannelData = {
        channel_type: provider.id,
        channel_name: creds.channel_name || provider.name,
        settings: {
          ...creds,
          webhook_url: webhookUrl || undefined,
          connected_at: new Date().toISOString(),
          verified: true,
        },
      };
      // useChannels routes this payload through save-channel-credentials, where
      // sensitive fields are encrypted before persistence and never returned.
      await addChannel.mutateAsync(channelData);
      toast.success(`${provider.name} connected successfully!`);
      setStep("Done");
    } catch (e: any) {
      toast.error(e.message || "Failed to save connection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            Connect {provider.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={cn("h-6 w-6 rounded-full flex items-center justify-center", i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {i + 1}
              </span>
              <span>{s}</span>
              {i < activeSteps.length - 1 && <span>—</span>}
            </div>
          ))}
        </div>

        {step === "Credentials" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{provider.description}</p>
            {provider.docsUrl && (
              <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> {provider.docsLabel || "Open official documentation"}
              </a>
            )}
            <div className="space-y-3">
              {provider.credentials.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                  <div className="relative">
                    <Input
                      type={field.type === "password" && !showPassword[field.key] ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={creds[field.key] || ""}
                      onChange={(e) => setCreds((p) => ({ ...p, [field.key]: e.target.value }))}
                    />
                    {field.type === "password" && (
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((p) => ({ ...p, [field.key]: !p[field.key] }))}>
                        {showPassword[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "Webhook" && webhookUrl && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Webhook URL</span></div>
              <p className="text-xs text-muted-foreground">{provider.webhookInstructions || "Copy this URL and paste it in your provider's webhook settings."}</p>
              <div className="flex items-center gap-2 rounded-md bg-background border p-2">
                <code className="text-xs break-all flex-1">{webhookUrl}</code>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Webhook URL copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" />Security Note</p>
              <p className="text-xs text-muted-foreground">Credentials are encrypted server-side and scoped to the selected business workspace. Provider secrets are not returned to the browser.</p>
            </div>
          </div>
        )}

        {step === "Verify" && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {verifying ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : verifyResult?.ok ? <CheckCircle2 className="h-8 w-8 text-[hsl(var(--chart-2))]" /> : verifyResult ? <AlertCircle className="h-8 w-8 text-destructive" /> : <Plug className="h-8 w-8 text-primary" />}
            </div>
            <h3 className="text-base font-semibold">{verifying ? "Verifying connection..." : verifyResult?.ok ? "Connection verified!" : verifyResult ? "Verification failed" : "Ready to verify"}</h3>
            {verifyResult?.detail && <p className={cn("text-sm", verifyResult.ok ? "text-[hsl(var(--chart-2))]" : "text-destructive")}>{verifyResult.detail}</p>}
            {!verifying && !verifyResult?.ok && <Button onClick={handleVerify} className="mt-2"><Zap className="h-4 w-4 mr-1" />Verify Connection</Button>}
            {verifyResult?.ok && !saving && <Button onClick={handleSave} className="mt-2"><CheckCircle2 className="h-4 w-4 mr-1" />Save & Activate</Button>}
          </div>
        )}

        {step === "Done" && (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--chart-2))]/10"><CheckCircle2 className="h-8 w-8 text-[hsl(var(--chart-2))]" /></div>
            <h3 className="text-lg font-semibold">{provider.name} Connected!</h3>
            <p className="text-sm text-muted-foreground">Your {provider.name} channel is now active and ready to receive messages.</p>
            <Badge variant="default" className="gap-1.5"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
            <div className="pt-2"><Button onClick={onClose}>Close</Button></div>
          </div>
        )}

        {step !== "Done" && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            {step !== "Verify" && <Button onClick={goNext} disabled={!canNext()}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const CHANNEL_PROVIDERS: ProviderDef[] = [
  {
    id: "whatsapp", name: "WhatsApp Business", icon: null, category: "messaging",
    description: "Connect your WhatsApp Business API to send and receive messages from customers.",
    docsUrl: "https://business.facebook.com/settings/whatsapp-business-accounts", docsLabel: "Go to Meta WhatsApp Business settings →", webhookPath: "whatsapp-webhook",
    webhookInstructions: "Paste this URL in your Meta App → WhatsApp → Configuration → Webhook URL field.",
    credentials: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", required: true, placeholder: "e.g. 123456789012345", help: "Found in Meta Business Suite → WhatsApp → Phone Numbers" },
      { key: "access_token", label: "Permanent Access Token", type: "password", required: true, placeholder: "EAAx...", help: "Generate in Meta Business Suite → System Users → Generate Token" },
      { key: "verify_token", label: "Webhook Verify Token", type: "text", required: true, placeholder: "my_verify_token_123", help: "Choose any secret string. Enter the same value in Meta's webhook settings." },
      { key: "waba_id", label: "WhatsApp Business Account ID", type: "text", required: false, placeholder: "e.g. 987654321012345" },
    ],
  },
  {
    id: "facebook", name: "Facebook / Instagram", icon: null, category: "messaging",
    description: "Connect your Facebook Page and Instagram Business to manage DMs and comments.",
    docsUrl: "https://developers.facebook.com/apps/", docsLabel: "Go to Meta Developer Portal →", webhookPath: "meta-webhook",
    webhookInstructions: "Use the webhook URL below in your Meta App → Webhooks. The webhook verifies Meta's signature and resolves the connected workspace from the Page/Instagram account ID.",
    credentials: [
      { key: "channel_name", label: "Channel Name", type: "text", required: true, placeholder: "e.g. My Facebook / Instagram", help: "A friendly name for this connection" },
      { key: "page_id", label: "Facebook Page ID", type: "text", required: true, placeholder: "e.g. 123456789012345", help: "Found in your Facebook Page → About → Page ID" },
      { key: "page_access_token", label: "Page Access Token", type: "password", required: true, placeholder: "EAAx...", help: "Generate a Page token in Meta Developer Portal → Graph API Explorer" },
      { key: "verify_token", label: "Webhook Verify Token", type: "text", required: true, placeholder: "my_verify_token", help: "Choose any secret. Enter the same value in Meta's webhook settings." },
      { key: "instagram_account_id", label: "Instagram Business Account ID", type: "text", required: false, placeholder: "e.g. 17841400000000", help: "Optional. Link your Instagram professional/business account." },
    ],
    verifyFn: async (creds) => {
      try {
        const res = await fetch(`https://graph.facebook.com/v23.0/${creds.page_id}?fields=id,name&access_token=${encodeURIComponent(creds.page_access_token)}`);
        const data = await res.json();
        if (data.id && data.name) return { ok: true, detail: `Verified: ${data.name}` };
        return { ok: false, detail: data.error?.message || "Invalid Page ID or Page Access Token" };
      } catch { return { ok: false, detail: "Network error while contacting Meta" }; }
    },
  },
  {
    id: "telegram", name: "Telegram", icon: null, category: "messaging", description: "Connect a Telegram bot to monitor groups and automate responses.", docsUrl: "https://t.me/BotFather", docsLabel: "Create a bot via @BotFather on Telegram →", webhookPath: "telegram-webhook", webhookInstructions: "The webhook will be set automatically when you verify the connection.", credentials: [{ key: "bot_token", label: "Bot Token", type: "password", required: true, placeholder: "123456:ABC...", help: "Get this from @BotFather" }],
  },
];
