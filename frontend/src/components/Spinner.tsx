import { Loader2 } from "lucide-react";

interface Props {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 20, className = "" }: Props) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-brand-600 dark:text-brand-400 ${className}`}
    />
  );
}
