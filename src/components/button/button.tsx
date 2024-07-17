import "./button.scss";

import { FunctionComponent, ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  outlined?: boolean;
  warning?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  horizontalPadding?: number;
  textColor?: string;
}

const Button: FunctionComponent<ButtonProps> = ({
  children,
  onClick,
  outlined,
  warning,
  disabled,
  fullWidth,
  horizontalPadding,
  textColor,
}) => {
  const classList = ["button"];
  if (outlined) classList.push("outlined");
  if (warning) classList.push("warning");
  if (disabled) classList.push("disabled");
  if (fullWidth) classList.push("fullWidth");

  return (
    <span
      className={classList.join(" ")}
      onClick={() => !disabled && onClick()}
      style={{
        paddingTop: `${horizontalPadding}rem`,
        paddingBottom: `${horizontalPadding}rem`,
        color: textColor,
      }}
    >
      {children}
    </span>
  );
};

export default Button;
