class ForceUpdateManager {
  forceUpdateList: Array<() => void> = [];

  constructor() {
    window.forceUpdate = (): void => {
      this.forceUpdateList.forEach((forceUpdate) => forceUpdate());
    };
  }

  register(forceUpdate: () => void) {
    this.forceUpdateList.push(forceUpdate);
  }
}

export default ForceUpdateManager;
