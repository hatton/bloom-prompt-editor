import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  HelpCircle,
  ThumbsDown,
  ThumbsUp,
  MessageCircleQuestion,
} from "lucide-react";

export type CorrectnessState = "correct" | "wrong" | "unknown";

interface CorrectnessButtonProps {
  state: CorrectnessState;
  onClick: () => void;
}

export const CorrectnessButton = ({
  state,
  onClick,
}: CorrectnessButtonProps) => {
  const getButtonContent = () => {
    switch (state) {
      case "correct":
        return {
          icon: <ThumbsUp className="h-4 w-4" />,
          className:
            "bg-green-100 text-green-700 hover:bg-green-200 border-green-300",
          disabled: true,
        };
      case "wrong":
        return {
          icon: <ThumbsDown className="h-4 w-4" />,
          className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-300",
          disabled: true,
        };
      case "unknown":
        return {
          icon: <MessageCircleQuestion className="h-4 w-4" />,
          className:
            "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300",
          disabled: false,
        };
    }
  };

  const { icon, className, disabled } = getButtonContent();

  return (
    <Button
      variant="outline"
      size="sm"
      className={`h-8 w-8 p-0 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </Button>
  );
};
