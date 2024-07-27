/**
 * A list of events that can be listened to.
 *
 * @enum
 */
enum RaitoEvents {
  settingsChanged = "settingsChanged",
  driverChanged = "driverChanged",
  syncStateChanged = "syncStateChanged",
  updateCollectionsStateChanged = "updateCollectionsStateChanged",
  screenChanged = "screenChanged",
  downloadChanged = "downloadChanged",
}

/**
 * Dispatch a event.
 *
 * @param eventId
 */
const dispatchEvent = (eventId: RaitoEvents) => {
  const event = new Event(eventId);
  window.dispatchEvent(event);
};

/**
 * A class that contains the info for a subscription.
 *
 * @class
 */
class RaitoSubscription {
  /**
   * Creates an instance of RaitoSubscription.
   *
   * @constructor
   * @param eventIds
   * @param action
   */
  constructor(public eventIds: Array<RaitoEvents>, public action: () => void) {}

  /**
   * Listen to all the events.
   */
  subscribe() {
    this.eventIds.forEach((event) =>
      window.addEventListener(event, () => this.action(), false)
    );
  }

  /**
   * Remove the listener for all the events.
   */
  unsubscribe() {
    this.eventIds.forEach((event) =>
      window.removeEventListener(event, () => this.action(), false)
    );
  }
}

/**
 * Helper function to listen for a array of events
 *
 * @param eventIds
 * @param action
 * @returns A RaitoSubscription instance that can be used to unsubscribe the events
 */
const listenToEvents = (eventIds: Array<RaitoEvents>, action: () => void) => {
  const subscription = new RaitoSubscription(eventIds, action);
  subscription.subscribe();
  return subscription;
};

export { dispatchEvent, listenToEvents, RaitoEvents, RaitoSubscription };
