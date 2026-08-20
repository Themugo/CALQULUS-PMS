import WebhostLayout from "@/features/webhost/components/WebhostLayout";
import { MultiBrandStudio } from "@/shared/components/branding/MultiBrandStudio";

export default function AdminBrandStudio() {
  return (
    <WebhostLayout
      title="Brand Studio"
      description="CALQULUS platform identity. Org white-label remains Settings → Company on the customer desk."
    >
      <MultiBrandStudio />
    </WebhostLayout>
  );
}
