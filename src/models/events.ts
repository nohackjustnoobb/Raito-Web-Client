enum RaitoEvents {
  settingsChanged = "settingsChanged",
  driverChanged = "driverChanged",
  syncStateChanged = "syncStateChanged",
  updateCollectionsStateChanged = "updateCollectionsStateChanged",
  screenChanged = "screenChanged",
  downloadChanged = "downloadChanged",
}

const dispatchEvent = (eventId: RaitoEvents) => {
  const event = new Event(eventId);
  window.dispatchEvent(event);
};

class RaitoSubscription {
  constructor(public eventIds: Array<RaitoEvents>, public action: () => void) {}

  subscribe() {
    this.eventIds.forEach((event) =>
      window.addEventListener(event, () => this.action(), false)
    );
  }

  unsubscribe() {
    this.eventIds.forEach((event) =>
      window.removeEventListener(event, () => this.action(), false)
    );
  }
}

const listenToEvents = (eventIds: Array<RaitoEvents>, action: () => void) => {
  const subscription = new RaitoSubscription(eventIds, action);
  subscription.subscribe();
  return subscription;
};

export { dispatchEvent, listenToEvents, RaitoEvents, RaitoSubscription };
