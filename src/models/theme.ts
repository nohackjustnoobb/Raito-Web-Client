/**
 * A class that represents a theme
 *
 * @class
 */
class Theme {
  /**
   * Creates an instance of Theme.
   *
   * @constructor
   * @param name The name of the theme.
   * @param style The CSS style of the theme.
   */
  constructor(public name: string, public style: string = "") {}

  /**
   * A function that remove all the applied theme.
   *
   * @static
   */
  static reset() {
    const elem = document.getElementById("injectedStyle");
    if (elem) document.body.removeChild(elem);

    window.updateRoot();
  }

  /**
   * Inject this theme into the document.
   */
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
