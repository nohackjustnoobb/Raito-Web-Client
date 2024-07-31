import "./inputPopup.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import Button from "../../components/button/button";
import Input, { InputProps } from "../../components/input/input";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

type Value = {
  value: string;
} & Omit<InputProps, "value" | "onChange" | "onKeyDown" | "fullWidth">;

type InputValues = { [value: string]: string };

interface Props extends InjectedPopableProps, WithTranslation {
  title?: string;
  values: Array<Value>;
  onSubmit: (
    input: InputValues,
    close: () => void,
    clear: (value: Array<string>) => void
  ) => void;
}

interface State {
  inputValues: InputValues;
}

class InputPopup extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const initValues: InputValues = {};
    this.props.values.forEach((v) => (initValues[v.value] = ""));

    this.state = {
      inputValues: initValues,
    };
  }

  submit() {
    this.props.onSubmit(
      this.state.inputValues,
      this.props.close.bind(this),
      this.clear.bind(this)
    );
  }

  clear(values?: Array<string>) {
    const clone = this.state.inputValues;

    if (values === undefined) values = Object.keys(clone);
    values.forEach((v) => {
      if (clone[v]) clone[v] = "";
    });

    this.setState({ inputValues: clone });
  }

  render(): ReactNode {
    return (
      <div className="inputPopup">
        {this.props.title && <h3>{this.props.title}</h3>}
        {this.props.values.map((input) => {
          const { value, ...other } = input;

          return (
            <Input
              fullWidth
              value={this.state.inputValues[value]}
              onChange={(v) =>
                this.setState((s) => {
                  const clone = { ...s };
                  clone.inputValues[value] = v;
                  return clone;
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") this.submit();
              }}
              {...other}
            />
          );
        })}
        <span>
          <Button outlined warning fullWidth onClick={() => this.props.close()}>
            {this.props.t("cancel")}
          </Button>
          <Button fullWidth onClick={this.submit.bind(this)}>
            {this.props.t("confirm")}
          </Button>
        </span>
      </div>
    );
  }
}

export default makePopable(withTranslation()(InputPopup));
