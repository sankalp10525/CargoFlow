import { PackageX } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <PackageX size={56} className="text-gray-300" />
      <h1 className="text-2xl font-bold text-gray-800">Page Not Found</h1>
      <p className="text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-2">
        Go Home
      </Link>
    </div>
  );
}
