import "./input.scss";

import { FunctionComponent, InputHTMLAttributes } from "react";

import { mdiClose } from "@mdi/js";
import Icon from "@mdi/react";

type InputProps = {
  fullWidth?: boolean;
  outlined?: boolean;
  leftIcon?: string;
  hideClear?: string;
  onChange: (value: string) => void;
  rows?: number;
} & Omit<
  InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
  "onChange"
>;

const Input: FunctionComponent<InputProps> = ({
  leftIcon,
  fullWidth,
  outlined,
  hideClear,
  onChange,
  rows,
  ...props
}) => {
  const classList = ["input"];
  if (outlined) classList.push("outlined");
  if (fullWidth) classList.push("fullWidth");

  const useTextarea = rows && rows > 1;

  return (
    <span className={classList.join(" ")}>
      {leftIcon && !useTextarea && (
        <span>
          <Icon path={leftIcon} size={1} color="#999999" />
        </span>
      )}
      {useTextarea ? (
        <textarea
          rows={rows}
          {...props}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input {...props} onChange={(e) => onChange(e.target.value)} />
      )}
      {!hideClear && !useTextarea && (
        <span className="clear" onClick={() => onChange("")}>
          <Icon path={mdiClose} size={1} color="#999999" />
        </span>
      )}
    </span>
  );
};

export default Input;
