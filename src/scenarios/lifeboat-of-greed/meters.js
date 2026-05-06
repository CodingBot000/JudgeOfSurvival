export const crisisMeters = [
  { id: "hull_damage", labelKey: "web.status.hull", max: 100, valueParam: "value" },
  { id: "water_ingress", labelKey: "web.status.ingress", max: 10, valueParam: "value" },
  { id: "load_pressure", labelKey: "web.status.load", max: 45, valueParam: "value" },
  { id: "despair", labelKey: "web.status.despair", max: 25, valueParam: "value" },
];

export const supportMeters = [
  { id: "food", labelKey: "web.status.food", max: 6, valueParam: "food" },
  { id: "storm_level", labelKey: "web.status.storm", max: 4, valueParam: "level" },
  { id: "alive_count", labelKey: "web.status.alive", max: 6, valueParam: "count" },
];

export const statusMetrics = [
  { id: "turn", icon: "gauge", labelKey: "ui.status.turn" },
  { id: "water", icon: "droplets", labelKey: "ui.status.water" },
  { id: "stability", icon: "waves", labelKey: "ui.status.stability" },
  { id: "rescue_chance", icon: "heart", labelKey: "ui.status.rescue" },
  { id: "minor_power", icon: "eye", labelKey: "ui.status.minor_power" },
  { id: "major_power", icon: "scale", labelKey: "ui.status.major_power" },
];

export const meters = {
  crisis: crisisMeters,
  support: supportMeters,
  status: statusMetrics,
};
