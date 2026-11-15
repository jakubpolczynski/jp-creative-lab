/** Seconds in one server -> computer -> server exchange. */
export const CYCLE_SECONDS = 10;
export function signalState(seconds, length, reducedMotion = false) {
  if (reducedMotion) return {outbound:-100,inbound:-100,rackBlink:0,roomBlink:0};
  const time = ((seconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  const travel = 2.8;
  const outbound = time >= 1 && time <= 3.8 ? (time-1)/travel*length : -100;
  const inbound = time >= 4.8 && time <= 7.6 ? (1-(time-4.8)/travel)*length : -100;
  const rackBlink = time >= 7.6 && time < 8.2 ? Math.min(1,(time-7.6)/.1)*Math.min(1,(8.2-time)/.5) : 0;
  const roomBlink = time >= 3.8 && time < 4.4 ? Math.min(1,(time-3.8)/.1)*Math.min(1,(4.4-time)/.5) : 0;
  return {outbound,inbound,rackBlink,roomBlink};
}
