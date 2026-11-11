export type HandoverAction = "hand_over" | "take_back" | "cancel";

/** The property is operated by the owner themselves (independent) or by an agency/manager. */
export function describeOperator(ownerId: string | undefined | null, operatorId: string | null | undefined) {
  const self = !!ownerId && (!operatorId || operatorId === ownerId);
  return { self, label: self ? "Managed by you" : "Managed by an agency or manager" };
}
