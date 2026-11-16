import { notFound } from "next/navigation";

// A 404 needs no instant-navigation check.
export const instant = false;

// Any unknown path inside a language shows that language's 404 page.
export default function CatchAll() {
  notFound();
}
