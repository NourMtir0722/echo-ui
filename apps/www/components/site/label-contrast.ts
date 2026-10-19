/**
 * The primary button's label contrast, measured the way the contract test
 * measures it: the same declared pairing (material-pairings.ts), at every
 * point of the cap's gradient, not at one stop. The generator shows it live,
 * so a visitor can watch the guarantee hold while they drag the seed.
 */
import { worstGradientContrast, type EchoTheme } from "echo-ui-core/theme";
import { TEXT_PAIRINGS, type TextPairing } from "@registry/echo/theme/material-pairings";

function pairing(name: string): TextPairing {
  const found = TEXT_PAIRINGS.find((p) => p.name === name);
  if (!found) throw new Error(`material-pairings.ts no longer declares "${name}"`);
  return found;
}

const PRIMARY_LABEL = pairing("hardware-button/primary label");

/** The worst contrast the primary label reaches anywhere on its cap. */
export function primaryLabelContrast(theme: EchoTheme): number {
  return worstGradientContrast(PRIMARY_LABEL.foreground(theme), PRIMARY_LABEL.background(theme), 40).ratio;
}

/** Two places, rounded down: a readout must never round a fail into a pass (4.499 is not 4.50). */
export const formatRatio = (ratio: number): string => (Math.floor(ratio * 100) / 100).toFixed(2);
