import { Link } from "react-router-dom";

interface TermsConsentProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Required Terms of Service / Privacy Policy acknowledgement for signup forms. */
export function TermsConsent({ id, checked, onChange }: TermsConsentProps) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
      />
      <label htmlFor={id} className="text-xs leading-5 text-muted-foreground">
        I have read and agree to the{" "}
        <Link to="/legal?tab=terms" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/legal?tab=privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
          Privacy Policy
        </Link>
        , including how my data is processed.
      </label>
    </div>
  );
}
