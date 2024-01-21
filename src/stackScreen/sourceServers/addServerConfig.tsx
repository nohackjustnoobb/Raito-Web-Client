import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import { Button, TextField } from "@mui/material";

import "./addServerConfig.scss";
import { pushLoader } from "../../utils/utils";
import Server from "../../models/server";

class AddServerConfig extends Component<
  {},
  { show: boolean; accessKey: string; address: string }
> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      address: "",
      accessKey: "",
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
    pushLoader();
    const accessKey = this.state.accessKey || null;
    const result = await Server.add(this.state.address, accessKey);
    window.stack.pop();

    if (result) {
      window.raito.settingsState.update(true);
      this.close();
    } else {
      alert("連線伺服器失敗");
    }
  }

  render(): ReactNode {
    return (
      <div className="addServerConfigWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="addServerConfig"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="addServerConfig">
            <div className="background" onClick={() => this.close()} />
            <div className="addServerConfigContent">
              <TextField
                size="small"
                id="outlined-basic"
                label="伺服器位址"
                variant="outlined"
                fullWidth
                value={this.state.address}
                onChange={(event) =>
                  this.setState({ address: event.target.value })
                }
              />
              <TextField
                size="small"
                id="outlined-basic"
                label="存取密鑰 (如有)"
                variant="outlined"
                fullWidth
                value={this.state.accessKey}
                onChange={(event) =>
                  this.setState({ accessKey: event.target.value })
                }
              />
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  fullWidth
                  onClick={() => this.close()}
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
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

export default AddServerConfig;
