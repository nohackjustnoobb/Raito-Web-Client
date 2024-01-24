class Theme {
  constructor(public name: string, public style: string = "") {}

  static reset() {
    const elem = document.getElementById("injectedStyle");
    if (elem) document.body.removeChild(elem);

    window.updateRoot();
  }

  inject() {
    Theme.reset();

    const style = document.createElement("style");
    style.id = "injectedStyle";
    style.textContent = this.style;
    document.body.appendChild(style);

    window.updateRoot();
  }
}

export default Theme;
