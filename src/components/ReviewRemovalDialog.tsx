import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const MIN_LENGTH = 20;

interface ReviewRemovalDialogProps {
  reviewId: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

/** Pedido de eliminação de uma avaliação, analisado pela equipa da plataforma. */
const ReviewRemovalDialog = ({ reviewId, onOpenChange, onSubmitted }: ReviewRemovalDialogProps) => {
  const [justification, setJustification] = useState("");
  const { t } = useTranslation("orders");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reviewId) return;
    if (justification.trim().length < MIN_LENGTH) {
      toast({ title: t("removal.tooShort", { count: MIN_LENGTH }), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("request_review_removal", {
      p_review_id: reviewId,
      p_justification: justification.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("removal.failed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("removal.sent"), description: t("removal.sentText") });
    setJustification("");
    setConfirmed(false);
    onSubmitted();
    onOpenChange(false);
  };

  return (
    <Dialog open={reviewId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("removal.title")}</DialogTitle>
          <DialogDescription>
            {t("removal.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value.slice(0, 1000))}
            placeholder={t("removal.placeholder")}
            rows={4}
          />
          <label htmlFor="removal-confirm" className="flex cursor-pointer items-start gap-3 text-xs text-muted-foreground">
            <Checkbox
              id="removal-confirm"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <span>
              {t("removal.confirm")}
            </span>
          </label>
          <Button onClick={submit} disabled={submitting || !confirmed} className="w-full gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("removal.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewRemovalDialog;
