import "./segmentedSelector.scss";

import { FunctionComponent } from "react";

import { useTranslation } from "react-i18next";

interface Option {
  value: string;
  disabled?: boolean;
}

type Props = {
  selected: string;
  options: Array<Option>;
  onChange: (value: string) => void;
};

const SegmentedSelector: FunctionComponent<Props> = (props) => {
  const index = props.options.findIndex(
    (option) => option.value === props.selected
  );
  const { t } = useTranslation();

  return (
    <div className="segmentedSelector">
      <div
        className="hover"
        style={{
          width: `calc(${100 / props.options.length}% - ${
            index === props.options.length - 1 ? "0.25" : "0"
          }rem)`,
          left: `calc(${(100 / props.options.length) * index}% + ${
            index === 0 ? "0.25" : "0"
          }rem)`,
        }}
      />
      <ul>
        {props.options.map((option) => (
          <li
            key={option.value}
            onClick={() => props.onChange(option.value)}
            className={
              option.disabled === undefined || option.disabled
                ? "disabled"
                : props.selected === option.value
                ? "selected"
                : ""
            }
          >
            {t(option.value)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SegmentedSelector;
