import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-gray-900">
          JobHunt
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/jobs" className="hover:text-gray-900">
            Jobs
          </Link>
          <Link href="/companies" className="hover:text-gray-900">
            Companies
          </Link>
          <Link href="/stats" className="hover:text-gray-900">
            Stats
          </Link>
          <Link href="/request" className="hover:text-gray-900">
            Request
          </Link>
        </div>
      </nav>
    </header>
  );
}
