import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, X } from "lucide-react";

interface InlineToastProps {
  title: string;
  variant?: "default" | "destructive";
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const InlineToast = React.forwardRef<HTMLDivElement, InlineToastProps>(
  (
    { title, variant = "default", duration = 2000, onClose, className },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300);
    };

    if (!isVisible) {
      return (
        <div
          ref={ref}
          className={cn(
            "transform transition-all duration-300 ease-out opacity-0 translate-y-2 scale-95",
            className
          )}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between space-x-3 px-4 py-3 rounded-md border shadow-sm transition-all duration-300 ease-out transform animate-in fade-in-0 slide-in-from-bottom-2",
          variant === "default"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800",
          className
        )}
      >
        <div className="flex items-center space-x-2">
          {variant === "default" ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
);

InlineToast.displayName = "InlineToast";
