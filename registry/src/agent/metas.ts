/**
 * Every registry item's meta, in ONE list.
 *
 * The agent artifacts, the docs site and the docs freshness tests all read
 * this, so there is no second list to forget. Two hand-kept copies of it (the
 * old METAS array in build-agent-artifacts and the docs manifest) are how
 * Segmented and Field shipped with empty examples for a whole wave.
 * `metas.test.ts` fails if any item directory has a meta.ts that is not here.
 *
 * Order here is not the docs order: that is the groups' (groups.ts).
 */
import type { MetaDocsFields } from "./meta-types";
import { meta as themeMeta } from "../echo/theme/meta";
import { meta as soundMeta } from "../echo/sound/meta";
import { meta as motionMeta } from "../echo/motion/meta";
import { meta as tactileMeta } from "../echo/tactile/meta";
import { meta as gsapPresenceMeta } from "../echo/gsap-presence/meta";
import { meta as hardwareButtonMeta } from "../echo/hardware-button/meta";
import { meta as sizeMeta } from "../echo/size/meta";
import { meta as scopeMeta } from "../echo/scope/meta";
import { meta as cardMeta } from "../echo/card/meta";
import { meta as itemMeta } from "../echo/item/meta";
import { meta as layoutMeta } from "../echo/layout/meta";
import { meta as collapsibleMeta } from "../echo/collapsible/meta";
import { meta as scrollAreaMeta } from "../echo/scroll-area/meta";
import { meta as linkMeta } from "../echo/link/meta";
import { meta as toggleMeta } from "../echo/toggle/meta";
import { meta as toolbarMeta } from "../echo/toolbar/meta";
import { meta as rangeSliderMeta } from "../echo/range-slider/meta";
import { meta as knobMeta } from "../echo/knob/meta";
import { meta as tunerMeta } from "../echo/tuner/meta";
import { meta as keypadMeta } from "../echo/keypad/meta";
import { meta as filterTrayMeta } from "../echo/filter-tray/meta";
import { meta as weekStripMeta } from "../echo/week-strip/meta";
import { meta as switchBankMeta } from "../echo/switch-bank/meta";
import { meta as jogWheelMeta } from "../echo/jog-wheel/meta";
import { meta as quickTileMeta } from "../echo/quick-tile/meta";
import { meta as fillSliderMeta } from "../echo/fill-slider/meta";
import { meta as patchBayMeta } from "../echo/patch-bay/meta";
import { meta as meterMeta } from "../echo/meter/meta";
import { meta as levelMeterMeta } from "../echo/level-meter/meta";
import { meta as comboboxMeta } from "../echo/combobox/meta";
import { meta as tagsInputMeta } from "../echo/tags-input/meta";
import { meta as fieldsetMeta } from "../echo/fieldset/meta";
import { meta as checkboxGroupMeta } from "../echo/checkbox-group/meta";
import { meta as formMeta } from "../echo/form/meta";
import { meta as holdButtonMeta } from "../echo/hold-button/meta";
import { meta as choiceCardsMeta } from "../echo/choice-cards/meta";
import { meta as sideNavMeta } from "../echo/side-nav/meta";
import { meta as tabBarMeta } from "../echo/tab-bar/meta";
import { meta as pullToRefreshMeta } from "../echo/pull-to-refresh/meta";
import { meta as notificationCenterMeta } from "../echo/notification-center/meta";
import { meta as switchMeta } from "../echo/switch/meta";
import { meta as checkboxMeta } from "../echo/checkbox/meta";
import { meta as sliderMeta } from "../echo/slider/meta";
import { meta as segmentedMeta } from "../echo/segmented/meta";
import { meta as fieldMeta } from "../echo/field/meta";
import { meta as dateFieldMeta } from "../echo/date-field/meta";
import { meta as calendarMeta } from "../echo/calendar/meta";
import { meta as datePickerMeta } from "../echo/date-picker/meta";
import { meta as fileUploadMeta } from "../echo/file-upload/meta";
import { meta as textareaMeta } from "../echo/textarea/meta";
import { meta as commandMeta } from "../echo/command/meta";
import { meta as selectMeta } from "../echo/select/meta";
import { meta as radioGroupMeta } from "../echo/radio-group/meta";
import { meta as numberFieldMeta } from "../echo/number-field/meta";
import { meta as otpFieldMeta } from "../echo/otp-field/meta";
import { meta as modalMeta } from "../echo/modal/meta";
import { meta as alertDialogMeta } from "../echo/alert-dialog/meta";
import { meta as sheetMeta } from "../echo/sheet/meta";
import { meta as menuMeta } from "../echo/menu/meta";
import { meta as popoverMeta } from "../echo/popover/meta";
import { meta as tooltipMeta } from "../echo/tooltip/meta";
import { meta as appShellMeta } from "../echo/app-shell/meta";
import { meta as tabsMeta } from "../echo/tabs/meta";
import { meta as accordionMeta } from "../echo/accordion/meta";
import { meta as tableMeta } from "../echo/table/meta";
import { meta as descriptionListMeta } from "../echo/description-list/meta";
import { meta as shortcutMapMeta } from "../echo/shortcut-map/meta";
import { meta as widgetGridMeta } from "../echo/widget-grid/meta";
import { meta as breadcrumbMeta } from "../echo/breadcrumb/meta";
import { meta as paginationMeta } from "../echo/pagination/meta";
import { meta as stepsMeta } from "../echo/steps/meta";
import { meta as panelMeta } from "../echo/panel/meta";
import { meta as progressMeta } from "../echo/progress/meta";
import { meta as loaderMeta } from "../echo/loader/meta";
import { meta as statusDotMeta } from "../echo/status-dot/meta";
import { meta as toastMeta } from "../echo/toast/meta";
import { meta as statusIslandMeta } from "../echo/status-island/meta";
import { meta as receiptMeta } from "../echo/receipt/meta";
import { meta as ticketMeta } from "../echo/ticket/meta";
import { meta as nowPlayingMeta } from "../echo/now-playing/meta";
import { meta as skeletonMeta } from "../echo/skeleton/meta";
import { meta as bannerMeta } from "../echo/banner/meta";
import { meta as emptyStateMeta } from "../echo/empty-state/meta";
import { meta as creatureMeta } from "../echo/creature/meta";
import { meta as perchMeta } from "../echo/perch/meta";
import { meta as badgeMeta } from "../echo/badge/meta";
import { meta as kbdMeta } from "../echo/kbd/meta";
import { meta as dividerMeta } from "../echo/divider/meta";
import { meta as statTileMeta } from "../echo/stat-tile/meta";
import { meta as chartMeta } from "../echo/chart/meta";
import { meta as lcdChipMeta } from "../echo/lcd-chip/meta";
import { meta as segmentDisplayMeta } from "../echo/segment-display/meta";
import { meta as dateTileMeta } from "../echo/date-tile/meta";
import { meta as annunciatorMeta } from "../echo/annunciator/meta";
import { meta as ledKeyMeta } from "../echo/led-key/meta";
import { meta as engravedPlateMeta } from "../echo/engraved-plate/meta";
import { meta as avatarMeta } from "../echo/avatar/meta";
import { meta as tagMeta } from "../echo/tag/meta";
import { meta as countBadgeMeta } from "../echo/count-badge/meta";
import { meta as texturesMeta } from "../echo/textures/meta";
import { meta as shaderFieldMeta } from "../echo/shader-field/meta";
import { meta as consoleMeta } from "../echo/console/meta";
import { meta as chatMeta } from "../echo/chat/meta";
import { meta as morphMeta } from "../echo/morph/meta";
import { meta as doneButtonMeta } from "../echo/done-button/meta";
import { meta as confirmButtonMeta } from "../echo/confirm-button/meta";
import { meta as actionFanMeta } from "../echo/action-fan/meta";
import { meta as saveButtonMeta } from "../echo/save-button/meta";
import { meta as timerMeta } from "../echo/timer/meta";
import { meta as stopwatchMeta } from "../echo/stopwatch/meta";
import { meta as voiceNoteMeta } from "../echo/voice-note/meta";
import { meta as addToBagMeta } from "../echo/add-to-bag/meta";
import { meta as budOffMeta } from "../echo/bud-off/meta";
import { meta as pullCordMeta } from "../echo/pull-cord/meta";
import { meta as splitFlapMeta } from "../echo/split-flap/meta";
import { meta as rollMeta } from "../echo/roll/meta";
import { meta as lightSourceMeta } from "../echo/light-source/meta";
import { meta as magneticMeta } from "../echo/magnetic/meta";
import { meta as throwStackMeta } from "../echo/throw-stack/meta";
import { meta as rippleMeta } from "../echo/ripple/meta";

export const ALL_METAS = [
  themeMeta,
  soundMeta,
  motionMeta,
  tactileMeta,
  gsapPresenceMeta,
  hardwareButtonMeta,
  sizeMeta,
  scopeMeta,
  cardMeta,
  itemMeta,
  layoutMeta,
  collapsibleMeta,
  scrollAreaMeta,
  linkMeta,
  toggleMeta,
  toolbarMeta,
  rangeSliderMeta,
  knobMeta,
  tunerMeta,
  keypadMeta,
  filterTrayMeta,
  weekStripMeta,
  switchBankMeta,
  jogWheelMeta,
  quickTileMeta,
  fillSliderMeta,
  patchBayMeta,
  meterMeta,
  levelMeterMeta,
  comboboxMeta,
  tagsInputMeta,
  fieldsetMeta,
  checkboxGroupMeta,
  formMeta,
  holdButtonMeta,
  choiceCardsMeta,
  sideNavMeta,
  tabBarMeta,
  pullToRefreshMeta,
  notificationCenterMeta,
  switchMeta,
  checkboxMeta,
  sliderMeta,
  segmentedMeta,
  fieldMeta,
  dateFieldMeta,
  calendarMeta,
  datePickerMeta,
  fileUploadMeta,
  textareaMeta,
  commandMeta,
  selectMeta,
  radioGroupMeta,
  numberFieldMeta,
  otpFieldMeta,
  modalMeta,
  alertDialogMeta,
  sheetMeta,
  menuMeta,
  popoverMeta,
  tooltipMeta,
  appShellMeta,
  tabsMeta,
  accordionMeta,
  tableMeta,
  descriptionListMeta,
  shortcutMapMeta,
  widgetGridMeta,
  breadcrumbMeta,
  paginationMeta,
  stepsMeta,
  panelMeta,
  progressMeta,
  loaderMeta,
  statusDotMeta,
  toastMeta,
  statusIslandMeta,
  receiptMeta,
  ticketMeta,
  nowPlayingMeta,
  skeletonMeta,
  bannerMeta,
  emptyStateMeta,
  creatureMeta,
  perchMeta,
  badgeMeta,
  kbdMeta,
  dividerMeta,
  statTileMeta,
  chartMeta,
  lcdChipMeta,
  segmentDisplayMeta,
  dateTileMeta,
  annunciatorMeta,
  ledKeyMeta,
  engravedPlateMeta,
  avatarMeta,
  tagMeta,
  countBadgeMeta,
  texturesMeta,
  shaderFieldMeta,
  consoleMeta,
  chatMeta,
  morphMeta,
  doneButtonMeta,
  confirmButtonMeta,
  actionFanMeta,
  saveButtonMeta,
  timerMeta,
  stopwatchMeta,
  voiceNoteMeta,
  addToBagMeta,
  budOffMeta,
  pullCordMeta,
  splitFlapMeta,
  rollMeta,
  lightSourceMeta,
  magneticMeta,
  throwStackMeta,
  rippleMeta,
] as const satisfies readonly (MetaDocsFields & { name: string })[];

export type AnyMeta = (typeof ALL_METAS)[number];

/** Registry item names, as a union — keys a Record that must cover every item. */
export type MetaName = AnyMeta["name"];

/** The source directory under `src/echo/` for each meta. */
export const META_DIRS: Readonly<Record<MetaName, string>> = {
  [themeMeta.name]: "theme",
  [soundMeta.name]: "sound",
  [motionMeta.name]: "motion",
  [tactileMeta.name]: "tactile",
  [gsapPresenceMeta.name]: "gsap-presence",
  [hardwareButtonMeta.name]: "hardware-button",
  [sizeMeta.name]: "size",
  [scopeMeta.name]: "scope",
  [cardMeta.name]: "card",
  [itemMeta.name]: "item",
  [layoutMeta.name]: "layout",
  [collapsibleMeta.name]: "collapsible",
  [scrollAreaMeta.name]: "scroll-area",
  [linkMeta.name]: "link",
  [toggleMeta.name]: "toggle",
  [toolbarMeta.name]: "toolbar",
  [rangeSliderMeta.name]: "range-slider",
  [knobMeta.name]: "knob",
  [tunerMeta.name]: "tuner",
  [keypadMeta.name]: "keypad",
  [filterTrayMeta.name]: "filter-tray",
  [weekStripMeta.name]: "week-strip",
  [switchBankMeta.name]: "switch-bank",
  [jogWheelMeta.name]: "jog-wheel",
  [quickTileMeta.name]: "quick-tile",
  [fillSliderMeta.name]: "fill-slider",
  [patchBayMeta.name]: "patch-bay",
  [meterMeta.name]: "meter",
  [levelMeterMeta.name]: "level-meter",
  [comboboxMeta.name]: "combobox",
  [tagsInputMeta.name]: "tags-input",
  [fieldsetMeta.name]: "fieldset",
  [checkboxGroupMeta.name]: "checkbox-group",
  [formMeta.name]: "form",
  [holdButtonMeta.name]: "hold-button",
  [choiceCardsMeta.name]: "choice-cards",
  [sideNavMeta.name]: "side-nav",
  [tabBarMeta.name]: "tab-bar",
  [pullToRefreshMeta.name]: "pull-to-refresh",
  [notificationCenterMeta.name]: "notification-center",
  [switchMeta.name]: "switch",
  [checkboxMeta.name]: "checkbox",
  [sliderMeta.name]: "slider",
  [segmentedMeta.name]: "segmented",
  [fieldMeta.name]: "field",
  [dateFieldMeta.name]: "date-field",
  [calendarMeta.name]: "calendar",
  [datePickerMeta.name]: "date-picker",
  [fileUploadMeta.name]: "file-upload",
  [textareaMeta.name]: "textarea",
  [commandMeta.name]: "command",
  [selectMeta.name]: "select",
  [radioGroupMeta.name]: "radio-group",
  [numberFieldMeta.name]: "number-field",
  [otpFieldMeta.name]: "otp-field",
  [modalMeta.name]: "modal",
  [alertDialogMeta.name]: "alert-dialog",
  [sheetMeta.name]: "sheet",
  [menuMeta.name]: "menu",
  [popoverMeta.name]: "popover",
  [tooltipMeta.name]: "tooltip",
  [appShellMeta.name]: "app-shell",
  [tabsMeta.name]: "tabs",
  [accordionMeta.name]: "accordion",
  [tableMeta.name]: "table",
  [descriptionListMeta.name]: "description-list",
  [shortcutMapMeta.name]: "shortcut-map",
  [widgetGridMeta.name]: "widget-grid",
  [breadcrumbMeta.name]: "breadcrumb",
  [paginationMeta.name]: "pagination",
  [stepsMeta.name]: "steps",
  [panelMeta.name]: "panel",
  [progressMeta.name]: "progress",
  [loaderMeta.name]: "loader",
  [statusDotMeta.name]: "status-dot",
  [toastMeta.name]: "toast",
  [statusIslandMeta.name]: "status-island",
  [receiptMeta.name]: "receipt",
  [ticketMeta.name]: "ticket",
  [nowPlayingMeta.name]: "now-playing",
  [skeletonMeta.name]: "skeleton",
  [bannerMeta.name]: "banner",
  [emptyStateMeta.name]: "empty-state",
  [creatureMeta.name]: "creature",
  [perchMeta.name]: "perch",
  [badgeMeta.name]: "badge",
  [kbdMeta.name]: "kbd",
  [dividerMeta.name]: "divider",
  [statTileMeta.name]: "stat-tile",
  [chartMeta.name]: "chart",
  [lcdChipMeta.name]: "lcd-chip",
  [segmentDisplayMeta.name]: "segment-display",
  [dateTileMeta.name]: "date-tile",
  [annunciatorMeta.name]: "annunciator",
  [ledKeyMeta.name]: "led-key",
  [engravedPlateMeta.name]: "engraved-plate",
  [avatarMeta.name]: "avatar",
  [tagMeta.name]: "tag",
  [countBadgeMeta.name]: "count-badge",
  [texturesMeta.name]: "textures",
  [shaderFieldMeta.name]: "shader-field",
  [consoleMeta.name]: "console",
  [chatMeta.name]: "chat",
  [morphMeta.name]: "morph",
  [doneButtonMeta.name]: "done-button",
  [confirmButtonMeta.name]: "confirm-button",
  [actionFanMeta.name]: "action-fan",
  [saveButtonMeta.name]: "save-button",
  [timerMeta.name]: "timer",
  [stopwatchMeta.name]: "stopwatch",
  [voiceNoteMeta.name]: "voice-note",
  [addToBagMeta.name]: "add-to-bag",
  [budOffMeta.name]: "bud-off",
  [pullCordMeta.name]: "pull-cord",
  [splitFlapMeta.name]: "split-flap",
  [rollMeta.name]: "roll",
  [lightSourceMeta.name]: "light-source",
  [magneticMeta.name]: "magnetic",
  [throwStackMeta.name]: "throw-stack",
  [rippleMeta.name]: "ripple",
};
