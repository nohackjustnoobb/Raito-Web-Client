class ForceUpdateManager {
  forceUpdateList: Array<[() => void, boolean]> = [];

  constructor() {
    window.forceUpdate = (screenEvent: boolean = false): void => {
      this.forceUpdateList.forEach((forceUpdate) => {
        if (screenEvent || !forceUpdate[1]) forceUpdate[0]();
      });
    };
  }

  register(forceUpdate: () => void, onlyListenOnScreenEvent: boolean = false) {
    this.forceUpdateList.push([forceUpdate, onlyListenOnScreenEvent]);
  }
}

export default ForceUpdateManager;
