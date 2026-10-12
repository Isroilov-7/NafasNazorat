"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { REFERRAL_STATUSES, type ReferralStatus } from "@/lib/domain/models";
import { updateFollowUpAction } from "./actions";

export function FollowUpForm({ patientId, status, nextReviewDate }: { patientId: string; status: ReferralStatus; nextReviewDate: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [referral, setReferral] = useState<ReferralStatus>(status);
  const [note, setNote] = useState("");
  const [review, setReview] = useState(nextReviewDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const dirty = referral !== status || review !== (nextReviewDate ?? "") || note.trim() !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateFollowUpAction({ patientId, referralStatus: referral, note, nextReviewDate: review });
      if (res.ok) {
        toast.success(referral !== status ? t("referral.updated") : t("referral.nextReviewUpdated"));
        setNote("");
        setErrors({});
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(t(res.error as never));
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t("referral.status")}>
        <Select value={referral} onChange={(e) => setReferral(e.target.value as ReferralStatus)}>
          {REFERRAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`referral.statuses.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      {referral !== status ? (
        <Field label={t("referral.note")} hint={t("referral.noteHint")} optionalText={t("common.optional")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
      ) : null}
      <Field label={t("referral.nextReview")} error={errors.nextReviewDate ? t(errors.nextReviewDate as never) : undefined}>
        <Input type="date" value={review} onChange={(e) => setReview(e.target.value)} />
      </Field>
      <Button type="submit" disabled={!dirty || pending} className="self-start">
        <Save /> {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
