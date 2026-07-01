"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@findmystaff/ui/components/button";
import { Input } from "@findmystaff/ui/components/input";
import { Label } from "@findmystaff/ui/components/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@findmystaff/ui/components/tabs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState("facility");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "provider" || tab === "facility") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter an email");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      // #region agent log
      fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',location:'auth/page.tsx:handleSendOtp',message:'OTP send attempt',data:{activeTab,normalizedEmail,providerCheckSkipped:activeTab!=='provider'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const { data: providerCheck, error: providerCheckError } =
        await supabase.rpc("check_provider_exists", {
          p_email: normalizedEmail,
        });

      if (activeTab === "provider") {
        if (providerCheckError || !providerCheck?.exists) {
          toast.error("This email is not registered as a provider");
          setLoading(false);
          return;
        }
      } else if (providerCheck?.exists) {
        toast.error(
          "This email is registered as a provider. Use the Provider sign-in tab.",
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          data: {
            user_type: activeTab,
          },
        },
      });

      if (error) {
        toast.error(`Error: ${error.message}. If you received the OTP email, you can still enter it below.`);
        setStep("otp");
      } else {
        toast.success("OTP sent! Check your email.");
        setStep("otp");
      }
    } catch (err) {
      toast.error("Failed to send OTP. If you received the email, you can still enter it below.");
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    setLoading(true);
    try {
      const normalizedVerifyEmail = email.toLowerCase().trim();
      // #region agent log
      fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',location:'auth/page.tsx:handleVerifyOtp',message:'OTP verify attempt',data:{activeTab,rawEmail:email,normalizedVerifyEmail,emailMismatch:email!==normalizedVerifyEmail},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedVerifyEmail,
        token: otp,
        type: "email",
      });

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'auth/page.tsx:handleVerifyOtp',message:'OTP verify failed',data:{errorMessage:error.message,rawEmail:email,normalizedVerifyEmail},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        toast.error(error.message);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", data.user!.id)
          .single();

        const storedType = profile?.user_type ?? null;
        // #region agent log
        fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'auth/page.tsx:handleVerifyOtp',message:'Profile role check after OTP',data:{activeTab,storedType,tabMismatch:storedType!=null&&storedType!==activeTab},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion

        if (!storedType) {
          toast.error("Account setup incomplete. Please try again.");
          await supabase.auth.signOut();
          return;
        }

        if (storedType !== activeTab) {
          toast.error(
            `This email is registered as a ${storedType}. Please use the ${storedType} sign-in tab.`,
          );
          await supabase.auth.signOut();
          return;
        }

        toast.success("Signed in successfully!");
        router.push(
          storedType === "facility"
            ? "/facility/dashboard"
            : "/provider/dashboard",
        );
      }
    } catch (err) {
      toast.error("Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md p-6 mt-10">
      <h1 className="mb-2 text-center text-3xl font-bold text-green-800 dark:text-green-200">findmystaff</h1>
      <p className="mb-6 text-center text-muted-foreground">
        Healthcare Staffing Network
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-green-50 dark:bg-green-950">
          <TabsTrigger value="facility" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Facility Sign In</TabsTrigger>
          <TabsTrigger value="provider" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Provider Sign In</TabsTrigger>
        </TabsList>

        <TabsContent value="facility">
          <div className="rounded-lg border border-green-100 dark:border-green-900 p-4 mt-4 bg-green-50/50 dark:bg-green-950/50">
            <h2 className="mb-2 font-semibold text-green-800 dark:text-green-200">Facility Admin</h2>
            <p className="text-sm text-muted-foreground">
              Manage facilities, providers, shifts, and assignments.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="provider">
          <div className="rounded-lg border border-green-100 dark:border-green-900 p-4 mt-4 bg-green-50/50 dark:bg-green-950/50">
            <h2 className="mb-2 font-semibold text-green-800 dark:text-green-200">Provider</h2>
            <p className="text-sm text-muted-foreground">
              View shifts, accept assignments, and manage your calendar.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-green-200 focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="otp">OTP Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter OTP from email"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="border-green-200 focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Sign In"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-green-200 hover:bg-green-50"
            onClick={() => setStep("email")}
            disabled={loading}
          >
            Back to Email
          </Button>
        </form>
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}
