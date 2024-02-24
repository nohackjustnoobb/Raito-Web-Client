import "./clearData.scss";

import { Component, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

import { pushLoader } from "../../utils/utils";

class ClearData extends Component<{}, { show: boolean; password: string }> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      password: "",
    };
  }

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async submit() {
    if (window.confirm("確定要刪除所有數據？")) {
      pushLoader();
      const result = await window.raito.user.clear(this.state.password);
      window.stack.pop();

      if (result) {
        this.close();
      } else {
        this.setState({ password: "" });
        alert("密碼錯誤");
      }
    }
  }

  render(): ReactNode {
    return (
      <div className="clearDataWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="clearData"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="clearData">
            <div className="background" onClick={() => this.close()} />
            <div className="clearDataContent">
              <TextField
                size="small"
                id="outlined-basic"
                label="密碼"
                variant="outlined"
                type="password"
                fullWidth
                autoComplete="current-password"
                value={this.state.password}
                onKeyDown={(event) => {
                  if (event.key === "Enter") this.submit();
                }}
                onChange={(event) =>
                  this.setState({ password: event.target.value })
                }
              />
              <span>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  fullWidth
                  onClick={() => this.close()}
                >
                  取消
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  fullWidth
                  onClick={() => this.submit()}
                >
                  確認
                </Button>
              </span>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default ClearData;
