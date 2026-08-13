import { Lock } from "lucide-react";

// ReferenceGrid: Capture and display document-level remarks and attachments.
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import {
  clipSapText,
  SAP_FIELD_MAX,
} from "@/features/create-pages/create-shared/utils/sap-document-fields";

interface ReferenceGridProps {
  referenceNo: string;
  comments: string;
  loading?: boolean;
  referenceNoDisabled?: boolean;
  commentsDisabled?: boolean;
  onReferenceNoDisabledClick?: () => void;
  onCommentsDisabledClick?: () => void;
  onReferenceNoChange: (value: string) => void;
  onCommentsChange: (value: string) => void;
  referenceNoInvalid?: boolean | undefined;
  commentsInvalid?: boolean | undefined;
  referenceNoErrorText?: string | undefined;
  commentsErrorText?: string | undefined;
  /** Visual-only override: read-only fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean;
  referenceLabel?: string;
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-linen-100 ${className}`} />;
}

function ReferenceTextarea({
  value,
  disabled,
  placeholder,
  height = "5.75rem",
  onChange,
  onClick,
  onFocus,
  invalid,
  invalidStyles,
  disabledStyles,
  maxLength,
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  height?: string;
  onChange: (value: string) => void;
  onClick?: () => void;
  onFocus?: () => void;
  invalid?: boolean;
  invalidStyles: string;
  disabledStyles: string;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      readOnly={disabled}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) {
          onClick?.();
        }
      }}
      onFocus={() => {
        if (disabled) {
          onFocus?.();
        }
      }}
      onChange={(event) =>
        onChange(
          maxLength !== undefined ? clipSapText(event.target.value, maxLength) : event.target.value,
        )
      }
      maxLength={maxLength}
      placeholder={placeholder}
      style={{ height, maxHeight: height, overflowY: "auto" }}
      className={`w-full resize-y rounded-xl border px-4 py-2 text-sm text-ink-900 outline-none transition placeholder:text-neutral-400 ${
        invalid
          ? invalidStyles
          : "border-linen-200 bg-field-silver focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
      } ${disabled ? disabledStyles : ""}`}
    />
  );
}

export function ReferenceGrid({
  referenceNo,
  comments,
  loading = false,
  referenceNoDisabled = false,
  commentsDisabled = false,
  onReferenceNoDisabledClick,
  onCommentsDisabledClick,
  onReferenceNoChange,
  onCommentsChange,
  referenceNoInvalid,
  commentsInvalid,
  referenceNoErrorText,
  commentsErrorText,
  uniformReadOnlyAppearance = false,
  referenceLabel,
}: ReferenceGridProps) {
  const fieldHeight = "74px";
  return (
    <SectionCard title="REFERENCE" className="lg:col-span-1">
      <div>
        <label
          htmlFor="po-customer-ref-no"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>{referenceLabel || "CUSTOMER REF NO"}</span>
            {referenceNoDisabled ? (
              <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
            ) : null}
          </span>
        </label>
        {loading ? (
          <Pulse className="min-h-[74px] w-full rounded-xl" />
        ) : (
          <ReferenceTextarea
            value={referenceNo}
            disabled={referenceNoDisabled}
            placeholder="Reference"
            height={fieldHeight}
            maxLength={SAP_FIELD_MAX.numAtCard}
            onChange={onReferenceNoChange}
            {...(onReferenceNoDisabledClick ? { onClick: onReferenceNoDisabledClick } : {})}
            {...(onReferenceNoDisabledClick ? { onFocus: onReferenceNoDisabledClick } : {})}
            {...(referenceNoInvalid !== undefined ? { invalid: referenceNoInvalid } : {})}
            invalidStyles="border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
            disabledStyles={
              uniformReadOnlyAppearance
                ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900"
                : "border-linen-200 bg-linen-100 text-neutral-500 opacity-100"
            }
          />
        )}
        {referenceNoInvalid && referenceNoErrorText ? (
          <p className="mt-1 text-xs text-red-600">{referenceNoErrorText}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="po-remarks"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>REMARKS</span>
            {commentsDisabled ? (
              <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
            ) : null}
          </span>
        </label>
        {loading ? (
          <Pulse className="min-h-[74px] w-full rounded-xl" />
        ) : (
          <ReferenceTextarea
            value={comments}
            disabled={commentsDisabled}
            placeholder="Transaction Remarks"
            height={fieldHeight}
            maxLength={SAP_FIELD_MAX.comments}
            onChange={onCommentsChange}
            {...(onCommentsDisabledClick ? { onClick: onCommentsDisabledClick } : {})}
            {...(onCommentsDisabledClick ? { onFocus: onCommentsDisabledClick } : {})}
            {...(commentsInvalid !== undefined ? { invalid: commentsInvalid } : {})}
            invalidStyles="border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
            disabledStyles={
              uniformReadOnlyAppearance
                ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900"
                : "cursor-not-allowed opacity-70"
            }
          />
        )}
        {commentsInvalid && commentsErrorText ? (
          <p className="mt-1 text-xs text-red-600">{commentsErrorText}</p>
        ) : null}
      </div>
    </SectionCard>
  );
}
