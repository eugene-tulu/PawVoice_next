/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as callSessions from "../callSessions.js";
import type * as checkout from "../checkout.js";
import type * as creem from "../creem.js";
import type * as creemWebhook from "../creemWebhook.js";
import type * as dodo from "../dodo.js";
import type * as http from "../http.js";
import type * as inviteInserts from "../inviteInserts.js";
import type * as invites from "../invites.js";
import type * as lib_duration from "../lib/duration.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_phone from "../lib/phone.js";
import type * as logs from "../logs.js";
import type * as payments from "../payments.js";
import type * as petMembers from "../petMembers.js";
import type * as pets from "../pets.js";
import type * as sessions from "../sessions.js";
import type * as usageEvents from "../usageEvents.js";
import type * as users from "../users.js";
import type * as vapi from "../vapi.js";
import type * as vapiSetup from "../vapiSetup.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  auth: typeof auth;
  billing: typeof billing;
  callSessions: typeof callSessions;
  checkout: typeof checkout;
  creem: typeof creem;
  creemWebhook: typeof creemWebhook;
  dodo: typeof dodo;
  http: typeof http;
  inviteInserts: typeof inviteInserts;
  invites: typeof invites;
  "lib/duration": typeof lib_duration;
  "lib/email": typeof lib_email;
  "lib/phone": typeof lib_phone;
  logs: typeof logs;
  payments: typeof payments;
  petMembers: typeof petMembers;
  pets: typeof pets;
  sessions: typeof sessions;
  usageEvents: typeof usageEvents;
  users: typeof users;
  vapi: typeof vapi;
  vapiSetup: typeof vapiSetup;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
