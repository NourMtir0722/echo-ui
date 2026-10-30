/**
 * The styles Echo publishes, as its site shows them: the same files the
 * registry build publishes to /e/styles/ and the CLI's `style list` and
 * `style fit` read, so a style can't be on one and missing from the other.
 * Echo's own comes first; the test keeps this list equal to the folder.
 */
import echo from "../../styles/echo.json";
import inkInstrument from "../../styles/ink-instrument.json";
import type { EchoStyle } from "./style-schema";

export const PUBLISHED_STYLES: readonly EchoStyle[] = [echo, inkInstrument] as EchoStyle[];
