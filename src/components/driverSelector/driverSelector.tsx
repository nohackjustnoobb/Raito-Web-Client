import "./driverSelector.scss";

import { FunctionComponent, useEffect, useReducer } from "react";
import { mdiChevronDown } from "@mdi/js";
import Icon from "@mdi/react";

import driversManager from "../../managers/driversManager";
import Driver from "../../models/driver";
import { listenToEvents, RaitoEvents } from "../../models/events";

const DriverSelector: FunctionComponent = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const raitoSubscription = listenToEvents(
      [RaitoEvents.driverChanged],
      forceUpdate
    );

    return () => {
      raitoSubscription.unsubscribe();
    };
  });

  return (
    <div className="driverSelector">
      <select
        value={driversManager.selected?.identifier}
        onChange={async (event) => {
          // change the selected driver
          await driversManager.select(event.target.value);
        }}
      >
        {driversManager.available?.map((v) => (
          <option key={v.identifier}>{v.identifier}</option>
        ))}
      </select>
      <Icon path={mdiChevronDown} size={1} />
    </div>
  );
};

export default DriverSelector;
