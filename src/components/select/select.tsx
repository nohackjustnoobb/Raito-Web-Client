import "./select.scss";

import { FunctionComponent } from "react";

import { mdiUnfoldMoreHorizontal } from "@mdi/js";
import Icon from "@mdi/react";

type Option = {
  value: number | string;
  text?: string;
};

interface SelectProps {
  options: Array<Option>;
  value: number | string;
  onChange: (value: number | string) => void;
}

const Select: FunctionComponent<SelectProps> = ({
  options,
  value,
  onChange,
}) => {
  const option = options.find((v) => v.value === value)!;

  return (
    <span className="select">
      <span>{option.text || option.value}</span>
      <span>
        <Icon path={mdiUnfoldMoreHorizontal} size={0.75} />
      </span>
      <select
        value={value}
        onChange={(e) => {
          const tryNum = Number(e.target.value);
          onChange(typeof value === "string" ? e.target.value : tryNum);
        }}
      >
        {options.map((v) => (
          <option key={v.value} value={v.value}>
            {v.text || v.value}
          </option>
        ))}
      </select>
    </span>
  );
};

export default Select;
