// Shared by the server layout (early script) and the client Rustknop.
// Must stay outside a "use client" file: a server component importing a
// constant from one gets a client reference, not the value.
export const CALM_KEY = "gw-calm";
