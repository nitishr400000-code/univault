"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@univault/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@univault/ui/components/field";
import { Textarea } from "@univault/ui/components/textarea";
import { toast } from "sonner";
import { z } from "zod";

import { useTRPC } from "@/utils/trpc";

const claimFormSchema = z.object({
  proofNote: z.string().trim().min(1, "Enter a proof note."),
});

const ClaimForm = ({ itemId }: { itemId: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const submitClaim = useMutation(
    trpc.claims.submit.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        toast.success("Your claim was submitted.");
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.items.byId.queryFilter({ id: itemId })
          ),
          queryClient.invalidateQueries(trpc.claims.myClaims.queryFilter()),
        ]);
      },
    })
  );

  const form = useForm({
    defaultValues: { proofNote: "" },
    onSubmit: async ({ value }) => {
      const parsed = claimFormSchema.parse(value);
      await submitClaim.mutateAsync({ itemId, proofNote: parsed.proofNote });
      form.reset();
    },
    validators: { onSubmit: claimFormSchema },
  });

  return (
    <section className="grid gap-3 border-t pt-4">
      <header className="grid gap-1">
        <h2 className="font-medium">Claim this item</h2>
        <p className="text-muted-foreground text-sm">
          Describe a detail that helps staff confirm it belongs to you.
        </p>
      </header>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="proofNote">
            {(field) => (
              <Field
                data-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
              >
                <FieldLabel htmlFor={field.name}>Proof note</FieldLabel>
                <Textarea
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  id={field.name}
                  name={field.name}
                  placeholder="Mention a mark, serial number, or other identifying detail."
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldDescription>
                  Text only. Do not attach proof photos.
                </FieldDescription>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting || submitClaim.isPending}
              type="submit"
            >
              {isSubmitting || submitClaim.isPending
                ? "Submitting..."
                : "Submit claim"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </section>
  );
};

export default ClaimForm;
