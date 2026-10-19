"use client";

import { createContext, useContext } from "react";

/** True inside a Toolbar: its controls render through Base UI's Toolbar parts. */
export const InToolbar = createContext(false);

export const useInToolbar = () => useContext(InToolbar);
