/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth/types').AuthUser | null;
  }
}
