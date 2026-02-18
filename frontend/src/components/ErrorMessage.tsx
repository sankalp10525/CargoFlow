import { AlertCircle } from "lucide-react";

interface Props {
  message?: string;
}

export default function ErrorMessage({ message = "Something went wrong." }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle size={16} className="shrink-0" />
      {message}
    </div>
  );
}
