class ForceUpdateManager {
  forceUpdateList: Array<[() => void, boolean]> = [];

  constructor() {
    window.forceUpdate = (screenEvent: boolean = false): void => {
      this.forceUpdateList.forEach((forceUpdate) => {
        if (screenEvent || !forceUpdate[1]) forceUpdate[0]();
      });
    };
  }

  register(
    forceUpdate: () => void,
    onlyListenOnScreenEvent: boolean = false
  ): number {
    return (
      this.forceUpdateList.push([forceUpdate, onlyListenOnScreenEvent]) - 1
    );
  }

  unregister(index: number) {
    delete this.forceUpdateList[index];
  }
}

export default ForceUpdateManager;
