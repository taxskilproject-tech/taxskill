"use client";

import { createContext } from "react";

import type { QueryScopeContextValue } from "@/lib/query/types/query.types";

export const QueryScopeContext =
  createContext<QueryScopeContextValue>(undefined);
